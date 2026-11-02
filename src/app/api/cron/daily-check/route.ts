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
    // 1. Verify CRON_SECRET if configured (Standard Vercel Cron header security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron Auth Rejected] Missing or invalid CRON_SECRET bearer token');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid CRON_SECRET bearer token' },
        { status: 401 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'https://dfd-it-support.vercel.app';

    const overdueLoans = await getOverdueLoans();
    const lowStockSupplies = await getLowStockSupplies();

    let overdueNotified = false;
    let lowStockNotified = false;

    // 2. Send Overdue Loan Alert if any exist
    if (overdueLoans.length > 0) {
      const res = await sendLineOverdueSummaryNotification(overdueLoans, { baseUrl });
      overdueNotified = res.delivered || res.success;
    }

    // 3. Send Low Stock Alert if any exist
    if (lowStockSupplies.length > 0) {
      const res = await sendLineLowStockSummaryNotification(lowStockSupplies, { baseUrl });
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
