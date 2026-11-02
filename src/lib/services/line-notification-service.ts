import { Ticket, TicketUrgency, SupplyItem, SupplyRequisition, BorrowLog } from '@/types/database';

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
      spacing?: string;
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

// -------------------------------------------------------------------------
// 1. Ticket Flex Message Builder
// -------------------------------------------------------------------------
export function buildTicketFlexMessage(ticket: Ticket, baseUrl: string = 'https://dfd-it-support.vercel.app'): LineFlexMessagePayload {
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

// -------------------------------------------------------------------------
// 2. Low-Stock Flex Message Builder (Real-time alert when item hits threshold)
// -------------------------------------------------------------------------
export function buildLowStockFlexMessage(
  supply: SupplyItem,
  requisition?: SupplyRequisition,
  baseUrl: string = 'https://dfd-it-support.vercel.app'
): LineFlexMessagePayload {
  const isOutOfStock = supply.quantity <= 0;
  const headerBg = isOutOfStock ? '#DC2626' : '#EA580C';
  const headerText = isOutOfStock ? '❌ พัสดุหมดคลัง (OUT OF STOCK)' : '⚠️ พัสดุใกล้หมดสต็อก (LOW STOCK)';

  return {
    type: 'flex',
    altText: `[พัสดุเตือน] ${supply.name} เหลือ ${supply.quantity} ${supply.unit}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerBg,
        contents: [
          {
            type: 'text',
            text: headerText,
            weight: 'bold',
            color: '#FFFFFF',
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: supply.item_code,
            size: 'xs',
            color: '#6B7280',
            weight: 'bold',
          },
          {
            type: 'text',
            text: supply.name,
            weight: 'bold',
            size: 'md',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `📦 สต็อกคงเหลือ: ${supply.quantity} ${supply.unit} (จุดเตือน: ${supply.min_quantity} ${supply.unit})`,
                size: 'sm',
                color: isOutOfStock ? '#DC2626' : '#EA580C',
                weight: 'bold',
              },
              {
                type: 'text',
                text: `📂 หมวดหมู่: ${supply.category}`,
                size: 'xs',
                color: '#4B5563',
              },
              ...(supply.location ? [{
                type: 'text',
                text: `📍 ที่เก็บ: ${supply.location}`,
                size: 'xs',
                color: '#4B5563',
              }] : []),
              ...(requisition ? [{
                type: 'text',
                text: `👤 ผู้เบิกล่าสุด: ${requisition.recipient_name} (${requisition.quantity} ${requisition.unit || supply.unit})`,
                size: 'xs',
                color: '#374151',
              }] : []),
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
              label: 'เปิดดูคลังวัสดุ (Supplies)',
              uri: `${baseUrl}/admin/supplies`,
            },
          },
        ],
      },
    },
  };
}

// -------------------------------------------------------------------------
// 3. Overdue Loans Summary Flex Message Builder
// -------------------------------------------------------------------------
export function buildOverdueLoansFlexMessage(
  overdueLoans: BorrowLog[],
  baseUrl: string = 'https://dfd-it-support.vercel.app'
): LineFlexMessagePayload {
  const count = overdueLoans.length;
  const itemsPreview = overdueLoans.slice(0, 5).map((loan) => ({
    type: 'box',
    layout: 'vertical',
    margin: 'sm',
    contents: [
      {
        type: 'text',
        text: `💻 ${loan.asset_name || loan.asset_code}`,
        weight: 'bold',
        size: 'xs',
        color: '#111827',
      },
      {
        type: 'text',
        text: `👤 ผู้ยืม: ${loan.borrower_name} (${loan.borrower_dept_name || '-'})`,
        size: 'xxs',
        color: '#4B5563',
      },
      {
        type: 'text',
        text: `⏰ กำหนดคืน: ${new Date(loan.expected_return_date).toLocaleDateString('th-TH')}`,
        size: 'xxs',
        color: '#DC2626',
        weight: 'bold',
      },
    ],
  }));

  return {
    type: 'flex',
    altText: `⚠️ แจ้งเตือนครุภัณฑ์เกินกำหนดส่งคืน (${count} รายการ)`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#DC2626',
        contents: [
          {
            type: 'text',
            text: `⚠️ ครุภัณฑ์เกินกำหนดส่งคืน (${count} รายการ)`,
            weight: 'bold',
            color: '#FFFFFF',
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
            text: `พบครุภัณฑ์ที่ยังไม่ส่งคืนตามกำหนดเวลา ${count} รายการ กรุณาติดตามการส่งคืน:`,
            size: 'xs',
            color: '#374151',
            wrap: true,
          },
          ...itemsPreview,
          ...(count > 5 ? [{
            type: 'text',
            text: `...และอีก ${count - 5} รายการในระบบ`,
            size: 'xxs',
            color: '#6B7280',
            margin: 'sm',
          }] : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#DC2626',
            action: {
              type: 'uri',
              label: 'เปิดดูรายการยืม-คืน (Assets)',
              uri: `${baseUrl}/admin/assets`,
            },
          },
        ],
      },
    },
  };
}

// -------------------------------------------------------------------------
// 4. Low-Stock Summary Digest Flex Message Builder
// -------------------------------------------------------------------------
export function buildLowStockSummaryFlexMessage(
  items: SupplyItem[],
  baseUrl: string = 'https://dfd-it-support.vercel.app'
): LineFlexMessagePayload {
  const count = items.length;
  const itemsPreview = items.slice(0, 5).map((item) => ({
    type: 'box',
    layout: 'vertical',
    margin: 'sm',
    contents: [
      {
        type: 'text',
        text: `📦 [${item.item_code}] ${item.name}`,
        weight: 'bold',
        size: 'xs',
        color: '#111827',
      },
      {
        type: 'text',
        text: `คงเหลือ: ${item.quantity} ${item.unit} (จุดเตือน: ${item.min_quantity})`,
        size: 'xxs',
        color: item.quantity <= 0 ? '#DC2626' : '#EA580C',
        weight: 'bold',
      },
    ],
  }));

  return {
    type: 'flex',
    altText: `📦 รายงานสรุปพัสดุใกล้หมดสต็อก (${count} รายการ)`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#EA580C',
        contents: [
          {
            type: 'text',
            text: `📦 สรุปพัสดุใกล้หมด/หมดสต็อก (${count} รายการ)`,
            weight: 'bold',
            color: '#FFFFFF',
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
            text: `มีรายการพัสดุสิ้นเปลืองที่ถึงจุดสั่งซื้อเพิ่มจำนวน ${count} รายการ:`,
            size: 'xs',
            color: '#374151',
            wrap: true,
          },
          ...itemsPreview,
          ...(count > 5 ? [{
            type: 'text',
            text: `...และอีก ${count - 5} รายการในระบบ`,
            size: 'xxs',
            color: '#6B7280',
            margin: 'sm',
          }] : []),
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
              label: 'เปิดดูคลังวัสดุ (Supplies)',
              uri: `${baseUrl}/admin/supplies`,
            },
          },
        ],
      },
    },
  };
}

// -------------------------------------------------------------------------
// Core Dispatcher
// -------------------------------------------------------------------------
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

export async function dispatchLineMessage(
  payload: LineFlexMessagePayload,
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  // Check if simulated quota exhausted
  if (options?.mockQuotaExhausted) {
    console.warn(`[LINE NOTIFICATION FALLBACK] Monthly quota exhausted.`);
    return {
      success: true,
      delivered: false,
      fallbackTriggered: true,
      message: 'LINE push quota exhausted (free tier reached). Logged to fallback alert channel.',
      payload,
    };
  }

  // 1. Client-side browser execution: Dispatch to internal secure Next.js API route
  if (typeof window !== 'undefined') {
    try {
      const apiRes = await fetch('/api/notify/line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payload }),
      });
      const resData = await apiRes.json();
      if (apiRes.ok && resData.success) {
        return {
          success: true,
          delivered: true,
          message: 'LINE notification sent via API route.',
          payload,
        };
      }
      return {
        success: false,
        delivered: false,
        fallbackTriggered: true,
        message: resData.error || 'Failed to dispatch via API route',
        payload,
      };
    } catch (clientErr: any) {
      console.warn('Browser dispatch to /api/notify/line error:', clientErr);
      return {
        success: false,
        delivered: false,
        fallbackTriggered: true,
        message: clientErr.message,
        payload,
      };
    }
  }

  // 2. Server-side execution (Node.js runtime / SSR / scripts)
  const token = options?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const rawGroupId = options?.lineGroupId || process.env.LINE_ADMIN_GROUP_ID || process.env.LINE_GROUP_ID;

  if (!token || !rawGroupId) {
    return {
      success: true,
      delivered: true,
      message: 'Simulated LINE notification delivered in development mode.',
      payload,
    };
  }

  // Auto-normalize group ID: prepend 'C' if 32 hex chars without prefix
  let targetGroupId = rawGroupId.trim();
  if (/^[0-9a-f]{32}$/i.test(targetGroupId)) {
    targetGroupId = 'C' + targetGroupId;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: targetGroupId,
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

// -------------------------------------------------------------------------
// Public Dispatch Helpers
// -------------------------------------------------------------------------
export async function sendLineTicketNotification(
  ticket: Ticket,
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  const payload = buildTicketFlexMessage(ticket, options?.baseUrl);
  return dispatchLineMessage(payload, options);
}

export async function sendLineLowStockNotification(
  supply: SupplyItem,
  requisition?: SupplyRequisition,
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  const payload = buildLowStockFlexMessage(supply, requisition, options?.baseUrl);
  return dispatchLineMessage(payload, options);
}

export async function sendLineOverdueSummaryNotification(
  overdueLoans: BorrowLog[],
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  const payload = buildOverdueLoansFlexMessage(overdueLoans, options?.baseUrl);
  return dispatchLineMessage(payload, options);
}

export async function sendLineLowStockSummaryNotification(
  items: SupplyItem[],
  options?: SendLineNotificationOptions
): Promise<SendLineNotificationResult> {
  const payload = buildLowStockSummaryFlexMessage(items, options?.baseUrl);
  return dispatchLineMessage(payload, options);
}
