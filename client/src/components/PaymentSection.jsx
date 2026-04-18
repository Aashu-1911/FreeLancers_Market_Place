import { useEffect, useMemo, useState } from "react";
import api from "../lib/api.js";

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function PaymentSection({ contractId, userRole, agreedAmount }) {
  const [payments, setPayments] = useState([]);
  const [amount, setAmount] = useState(agreedAmount ? String(Number(agreedAmount)) : "");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [transactionDate, setTransactionDate] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingById, setIsUpdatingById] = useState({});

  const latestPayment = useMemo(() => (payments.length > 0 ? payments[0] : null), [payments]);

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
        payment_status: paymentStatus,
        transaction_date: transactionDate || new Date().toISOString(),
      });

      await loadPayments();
      setSuccessMessage("Payment record created.");
      setAmount(agreedAmount ? String(Number(agreedAmount)) : "");
      setPaymentStatus("pending");
      setTransactionDate("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to create payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkCompleted = async (paymentId) => {
    try {
      setError("");
      setSuccessMessage("");
      setIsUpdatingById((prev) => ({ ...prev, [paymentId]: true }));

      await api.put(`/api/payments/${paymentId}`, {
        payment_status: "completed",
      });

      await loadPayments();
      setSuccessMessage("Payment marked as completed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update payment");
    } finally {
      setIsUpdatingById((prev) => ({ ...prev, [paymentId]: false }));
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
            <p className="mt-1 text-base font-semibold text-slate-900">
              {latestPayment ? latestPayment.payment_status : "No payment record yet"}
            </p>
          </div>

          {userRole === "client" ? (
            <form className="mt-5 space-y-3" onSubmit={handleCreatePayment}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Add Payment Record</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                  required
                />
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Adding..." : "Add Payment"}
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
                  </div>

                  {userRole === "client" && payment.payment_status !== "completed" ? (
                    <button
                      type="button"
                      onClick={() => handleMarkCompleted(payment.payment_id)}
                      disabled={Boolean(isUpdatingById[payment.payment_id])}
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingById[payment.payment_id] ? "Updating..." : "Mark Completed"}
                    </button>
                  ) : null}
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
