"use client"

import { useState } from "react"

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type PlanSwitchButtonProps = {
  currentPlanLabel: string
  targetPlanId: string
  targetPlanLabel: string
}

export function PlanSwitchButton({ currentPlanLabel, targetPlanId, targetPlanLabel }: PlanSwitchButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button type="button" className="w-full rounded border px-4 py-2 text-sm font-medium text-slate-900">
          Switch to {targetPlanLabel}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Confirm plan change</p>
          <DialogTitle>Switch from {currentPlanLabel} to {targetPlanLabel}?</DialogTitle>
          <DialogDescription asChild>
            <div>
              <p>This updates your existing Stripe subscription immediately.</p>
              <p>Stripe may apply a prorated charge or credit for the rest of the current billing period.</p>
              <p>Your current paid plan will be replaced. Use billing details and cancellation if you only need to update the payment method or cancel access.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900">
              Keep current plan
            </button>
          </DialogClose>
          <form action="/api/billing/checkout" method="post">
            <input type="hidden" name="planId" value={targetPlanId} />
            <input type="hidden" name="confirmChange" value="true" />
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Confirm switch to {targetPlanLabel}
            </button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
