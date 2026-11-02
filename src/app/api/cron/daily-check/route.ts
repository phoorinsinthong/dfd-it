import { NextRequest, NextResponse } from 'next/server';
import { getOverdueLoans } from '@/lib/services/asset-service';
import { getLowStockSupplies } from '@/lib/services/supply-service';
import {
  sendLineOverdueSummaryNotification,
  sendLineLowStockSummaryNotification,
} from '@/lib/services/line-notification-service';

export async function GET(req: NextRequest) {
  return handleCheck(req);
}

export async function POST(req: NextRequest) {
  return handleCheck(req);
}

async function handleCheck(req: NextRequest) {
  try {
    const overdueLoans = await getOverdueLoans();
    const lowStockSupplies = await getLowStockSupplies();

    let overdueNotified = false;
    let lowStockNotified = false;

    // 1. Send Overdue Loan Alert if any exist
    if (overdueLoans.length > 0) {
      const res = await sendLineOverdueSummaryNotification(overdueLoans);
      overdueNotified = res.delivered || res.success;
    }

    // 2. Send Low Stock Alert if any exist
    if (lowStockSupplies.length > 0) {
      const res = await sendLineLowStockSummaryNotification(lowStockSupplies);
      lowStockNotified = res.delivered || res.success;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overdueCount: overdueLoans.length,
      lowStockCount: lowStockSupplies.length,
      notificationsDispatched: {
        overdue: overdueNotified,
        lowStock: lowStockNotified,
      },
    });
  } catch (error: any) {
    console.error('[Daily Check Cron Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal error during daily check' },
      { status: 500 }
    );
  }
}
