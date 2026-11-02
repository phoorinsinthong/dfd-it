import { NextRequest, NextResponse } from 'next/server';
import { buildTicketFlexMessage } from '@/lib/services/line-notification-service';
import { Ticket } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const rawGroupId = process.env.LINE_ADMIN_GROUP_ID || process.env.LINE_GROUP_ID;

    if (!token || !rawGroupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'LINE credentials not configured (LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_GROUP_ID missing)',
        },
        { status: 500 }
      );
    }

    // Auto-normalize group ID: If 32-char hex without C/U/R prefix, prepend 'C'
    let targetGroupId = rawGroupId.trim();
    if (/^[0-9a-f]{32}$/i.test(targetGroupId)) {
      targetGroupId = 'C' + targetGroupId;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'https://dfd-it-support.vercel.app';

    let messagePayload: any;

    if (body.test) {
      // Test Notification Payload
      messagePayload = {
        type: 'flex',
        altText: '🔔 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE Bot IT Support',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#2563EB',
            contents: [
              {
                type: 'text',
                text: '🔔 ระบบแจ้งเตือนแผนกไอที',
                weight: 'bold',
                color: '#FFFFFF',
                size: 'md',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: 'ทดสอบการเชื่อมต่อ LINE Messaging API สำเร็จ!',
                weight: 'bold',
                size: 'sm',
                color: '#10B981',
                wrap: true,
              },
              {
                type: 'text',
                text: `ทดสอบเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
                size: 'xs',
                color: '#6B7280',
              },
              {
                type: 'text',
                text: 'ระบบพร้อมส่งข้อความแจ้งเตือนเมื่อมีผู้แจ้งซ่อมใหม่ทันที',
                size: 'xs',
                color: '#374151',
                wrap: true,
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#2563EB',
                action: {
                  type: 'uri',
                  label: 'เข้าสู่ระบบ IT Support',
                  uri: `${baseUrl}/admin`,
                },
              },
            ],
          },
        },
      };
    } else if (body.ticket) {
      const ticket: Ticket = body.ticket;
      messagePayload = buildTicketFlexMessage(ticket, baseUrl);
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing ticket object or test flag in request body' },
        { status: 400 }
      );
    }

    // Call LINE Messaging API push endpoint
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetGroupId,
        messages: [messagePayload],
      }),
    });

    if (!lineResponse.ok) {
      const errText = await lineResponse.text();
      console.error(`[LINE API Error] status: ${lineResponse.status}, body: ${errText}`);
      return NextResponse.json(
        {
          success: false,
          error: `LINE API returned status ${lineResponse.status}: ${errText}`,
        },
        { status: lineResponse.status }
      );
    }

    const data = await lineResponse.json();
    return NextResponse.json({
      success: true,
      message: 'LINE notification sent successfully',
      data,
    });
  } catch (error: any) {
    console.error('[LINE Notify Route Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while sending LINE notification' },
      { status: 500 }
    );
  }
}
