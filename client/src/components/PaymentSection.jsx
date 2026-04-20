import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../lib/api.js";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function PaymentSection({ contractId, userRole, agreedAmount, contractStatus, onPaymentUpdated }) {
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState(agreedAmount ? String(Number(agreedAmount)) : "");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestPayment = useMemo(() => (payments.length > 0 ? payments[0] : null), [payments]);
  const hasCompletedPayment = useMemo(
    () => payments.some((payment) => payment.payment_status === "completed"),
    [payments]
  );
  const canClientPay = userRole === "client" && contractStatus === "completed" && !hasCompletedPayment;
  const currentStatusLabel = hasCompletedPayment ? "Completed" : "Pending";

  const statusRemark = useMemo(() => {
    if (hasCompletedPayment) {
      return "Payment completed successfully and transaction ID is generated.";
    }

    if (contractStatus !== "completed") {
      return "Mark work as finished first, then proceed to payment.";
    }

    return "Work is finished. Payment is pending.";
  }, [hasCompletedPayment, contractStatus]);

  const loadPayments = async () => {
    const response = await api.get(`/api/payments/contract/${contractId}`);
    setPayments(response.data);
  };

  useEffect(() => {
    const initialize = async () => {
      if (!contractId) {
        return;
      }

      try {
        setError("");
        await loadPayments();
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load payments");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [contractId]);

  const handleCreatePayment = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);

      await api.post("/api/payments", {
        contract_id: contractId,
        amount: Number(amount),
      });

      await loadPayments();
      if (typeof onPaymentUpdated === "function") {
        await onPaymentUpdated();
      }

      setSuccessMessage("Payment successful. Transaction ID generated.");
      toast.success("Payment successful.");
      setAmount(agreedAmount ? String(Number(agreedAmount)) : "");
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Failed to create payment";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Payments</h3>

      {isLoading ? <p className="mt-3 text-slate-600">Loading payments...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}

      {!isLoading ? (
        <>
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Current Payment Status</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{currentStatusLabel}</p>
            <p className="mt-1 text-sm text-slate-500">{statusRemark}</p>
          </div>

          {userRole === "client" ? (
            <form className="mt-5 space-y-3" onSubmit={handleCreatePayment}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Complete Payment</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                  required
                  disabled={!canClientPay}
                />
                <p className="self-center text-sm text-slate-600">
                  {contractStatus === "completed"
                    ? hasCompletedPayment
                      ? "Payment already completed for this contract."
                      : "Ready to process payment."
                    : "Work must be marked as finished before payment."}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !canClientPay}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Processing..." : "Pay Now"}
              </button>
            </form>
          ) : null}

          <ul className="mt-5 space-y-3">
            {payments.map((payment) => (
              <li key={payment.payment_id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(payment.transaction_date).toLocaleDateString()} • {payment.payment_status}
                    </p>
                    <p className="text-xs text-slate-500">Transaction ID: {payment.transaction_id || "Pending"}</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">Remark: {payment.remark || "Payment update available."}</p>
                  </div>
                </div>
              </li>
            ))}
            {payments.length === 0 ? <li className="text-sm text-slate-500">No payment records yet.</li> : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export default PaymentSection;
