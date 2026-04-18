import { useEffect, useState } from "react";
import api from "../lib/api.js";

function renderRatingBar(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"*".repeat(safe)}${"-".repeat(5 - safe)} (${safe}/5)`;
}

function ReviewForm({ contractId, reviewerUserId }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [existingReview, setExistingReview] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExistingReview = async () => {
      try {
        setError("");
        const response = await api.get(`/api/reviews/contract/${contractId}`);
        setExistingReview(response.data);
      } catch (requestError) {
        if (requestError.response?.status !== 404) {
          setError(requestError.response?.data?.message || "Failed to load review information");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingReview();
  }, [contractId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!rating) {
      setError("Please select a rating between 1 and 5.");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setIsSubmitting(true);

      const response = await api.post("/api/reviews", {
        contract_id: contractId,
        user_id: reviewerUserId,
        rating,
        comment: comment || null,
      });

      setExistingReview(response.data);
      setSuccessMessage("Review submitted successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Review</h3>
        <p className="mt-3 text-slate-600">Loading review data...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Review</h3>

      {existingReview ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">Review already submitted</p>
          <p className="mt-1 text-sm text-slate-700">Rating: {renderRatingBar(existingReview.rating)}</p>
          <p className="mt-1 text-sm text-slate-700">Comment: {existingReview.comment || "No comment"}</p>
        </div>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm font-medium text-slate-700">Select Rating</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    rating === value
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-600">Selected: {renderRatingBar(rating)}</p>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Comment
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share your feedback about this contract"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {error && existingReview ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

export default ReviewForm;
