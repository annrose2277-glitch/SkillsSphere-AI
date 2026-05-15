import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/interviewService";
import Pagination from "../../../shared/components/Pagination";
import {
  Plus,
  Clock,
  BarChart3,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import "../styles/mock-interview.css";

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getHistory(page, 10);
      setSessions(res.data?.sessions || []);
      setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError("Failed to load interview history.");
      console.error("[InterviewHistory] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="session-loading">
          <Loader2 className="spin-icon" size={48} />
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Interview History</h1>
        <button
          className="btn-new-interview"
          onClick={() => navigate("/mock-interview")}
        >
          <Plus size={16} /> New Interview
        </button>
      </div>

      {error && <div className="lobby-error">{error}</div>}

      {sessions.length === 0 && !error ? (
        <div className="history-empty">
          <BookOpen size={48} />
          <p>No interviews yet. Start your first one!</p>
          <button
            className="btn-new-interview"
            style={{ marginTop: "1rem" }}
            onClick={() => navigate("/mock-interview")}
          >
            <Plus size={16} /> Start Interview
          </button>
        </div>
      ) : (
        <>
          {sessions.map((session) => (
            <div
              key={session._id}
              className="history-card"
              onClick={() =>
                navigate(`/mock-interview/${session._id}/results`)
              }
            >
              <div className="history-card-info">
                <span className="history-card-topic">{session.topic}</span>
                <div className="history-card-meta">
                  <span>{formatDate(session.createdAt)}</span>
                  <span>•</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {session.difficulty}
                  </span>
                  {session.duration && (
                    <>
                      <span>•</span>
                      <span>
                        <Clock size={12} style={{ display: "inline", marginRight: 2 }} />
                        {session.duration}s
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{session.totalQuestions} questions</span>
                </div>
              </div>
              <div className="history-card-score">
                {session.overallScore || 0}%
              </div>
            </div>
          ))}

          {pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchHistory(p)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default InterviewHistory;
