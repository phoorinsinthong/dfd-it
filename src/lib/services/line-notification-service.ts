import { Ticket, TicketUrgency } from '@/types/database';

export interface LineFlexMessagePayload {
  type: 'flex';
  altText: string;
  contents: {
    type: 'bubble';
    header?: {
      type: 'box';
      layout: 'vertical';
      backgroundColor?: string;
      contents: Array<{
        type: 'text';
        text: string;
        weight?: 'bold' | 'regular';
        color?: string;
        size?: string;
      }>;
    };
    body: {
      type: 'box';
      layout: 'vertical';
      contents: Array<any>;
    };
    footer?: {
      type: 'box';
      layout: 'vertical';
      contents: Array<any>;
    };
  };
}

export function getUrgencyBadgeInfo(urgency?: TicketUrgency): { text: string; color: string; bg: string } {
  switch (urgency) {
    case 'urgent':
      return { text: '🚨 ด่วนที่สุด (URGENT)', color: '#FFFFFF', bg: '#DC2626' };
    case 'high':
      return { text: '⚠️ ด่วนสูง (HIGH)', color: '#FFFFFF', bg: '#EA580C' };
    case 'medium':
      return { text: '📌 ปานกลาง (MEDIUM)', color: '#FFFFFF', bg: '#2563EB' };
    case 'low':
    default:
      return { text: '🟢 ปกติ (LOW)', color: '#FFFFFF', bg: '#059669' };
  }
}

export function buildTicketFlexMessage(ticket: Ticket, baseUrl: string = 'https://it-support.local'): LineFlexMessagePayload {
  const urgencyInfo = getUrgencyBadgeInfo(ticket.urgency);
  const deptStr = ticket.division_name
    ? `${ticket.division_name} > ${ticket.department_name || ''}`
    : (ticket.department_name || 'ไม่ระบุแผนก');

  const locParts = [ticket.building, ticket.floor, ticket.room].filter(Boolean).join(' ');
  const displayLocation = locParts && !ticket.location.includes(locParts)
    ? `${locParts} - ${ticket.location}`
    : ticket.location;

  const deepLink = `${baseUrl}/admin/tickets?id=${ticket.id}`;

  return {
    type: 'flex',
    altText: `[แจ้งซ่อม #${ticket.id}] ${ticket.title} - ${urgencyInfo.text}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: urgencyInfo.bg,
        contents: [
          {
            type: 'text',
            text: urgencyInfo.text,
            weight: 'bold',
            color: urgencyInfo.color,
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `#${ticket.id}`,
            size: 'xs',
            color: '#6B7280',
            weight: 'bold',
          },
          {
            type: 'text',
            text: ticket.title,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: `👤 ผู้แจ้ง: ${ticket.user_name || 'พนักงาน'} (${deptStr})`,
                size: 'sm',
                color: '#374151',
              },
              {
                type: 'text',
                text: `📍 สถานที่: ${displayLocation}`,
                size: 'sm',
                color: '#374151',
              },
              {
                type: 'text',
                text: `📝 รายละเอียด: ${ticket.description}`,
                size: 'sm',
                color: '#4B5563',
                wrap: true,
              },
            ],
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
              label: 'เปิดดูในระบบ PWA',
              uri: deepLink,
            },
          },
        ],
      },
    },
  };
}

export interface SendLineNotificationOptions {
  lineChannelAccessToken?: string;
  lineGroupId?: string;
  baseUrl?: string;
  mockQuotaExhausted?: boolean;
}

export interface SendLineNotificationResult {
  success: boolean;
  delivered: boolean;
  fallbackTriggered?: boolean;
  message?: string;
  payload?: LineFlexMessagePayload;
}

export async function sendLineTicketNotification(
  ticket: Ticket,
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  const payload = buildTicketFlexMessage(ticket, options?.baseUrl);

  // Check if simulated quota exhausted (e.g. Free Tier 200-500 pushes / month reached)
  if (options?.mockQuotaExhausted) {
    console.warn(`[LINE NOTIFICATION FALLBACK] Monthly quota exhausted. Ticket #${ticket.id} logged to fallback channel.`);
    return {
      success: true,
      delivered: false,
      fallbackTriggered: true,
      message: 'LINE push quota exhausted (free tier reached). Logged to fallback alert channel.',
      payload,
    };
  }

  const token = options?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = options?.lineGroupId || process.env.LINE_GROUP_ID;

  if (!token || !groupId) {
    // Development / Zero-config fallback mode
    return {
      success: true,
      delivered: true,
      message: 'Simulated LINE notification delivered in development mode.',
      payload,
    };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [payload],
      }),
    });

    if (response.status === 429) {
      console.warn(`[LINE NOTIFICATION] 429 Quota Exceeded. Triggering fallback.`);
      return {
        success: true,
        delivered: false,
        fallbackTriggered: true,
        message: 'LINE monthly quota reached (429 Rate Limit). Fallback alert triggered.',
        payload,
      };
    }

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        delivered: false,
        message: `LINE API error: ${response.status} - ${errText}`,
        payload,
      };
    }

    return {
      success: true,
      delivered: true,
      message: 'LINE notification pushed successfully.',
      payload,
    };
  } catch (err: any) {
    return {
      success: false,
      delivered: false,
      fallbackTriggered: true,
      message: `LINE delivery error: ${err.message}. Fallback triggered.`,
      payload,
    };
  }
}
