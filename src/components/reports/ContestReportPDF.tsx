import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ContestReportData } from "@/hooks/useContestReport";

// ---------------------------------------------------------------------------
// Styles (using built-in Helvetica — no external font registration needed)
// ---------------------------------------------------------------------------
const S = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2328",
    backgroundColor: "#ffffff",
  },

  // Cover
  coverPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#0969da",
    textAlign: "center",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#57606a",
    textAlign: "center",
    marginBottom: 8,
  },
  coverMeta: {
    fontSize: 11,
    color: "#57606a",
    textAlign: "center",
    marginBottom: 4,
  },
  coverGenerated: {
    fontSize: 8,
    color: "#8c959f",
    textAlign: "center",
    marginTop: 48,
  },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0969da",
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0969da",
  },

  // Stat boxes
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f6f8fa",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#d0d7de",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 8,
    color: "#57606a",
    marginBottom: 3,
    textAlign: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0969da",
    textAlign: "center",
  },
  statValueDanger: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#cf222e",
    textAlign: "center",
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d0d7de",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#f6f8fa",
  },
  tableHeader: {
    backgroundColor: "#eaeef2",
  },
  cell: { flex: 1, fontSize: 8 },
  cellBold: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" },
  cellWide: { flex: 2, fontSize: 8 },
  cellGreen: { flex: 1, fontSize: 8, color: "#1a7f37" },
  cellRed: { flex: 1, fontSize: 8, color: "#cf222e" },
  cellMuted: { flex: 1, fontSize: 8, color: "#57606a" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 80,
    fontSize: 7,
    color: "#8c959f",
    borderTopWidth: 0.5,
    borderTopColor: "#d0d7de",
    paddingTop: 6,
  },
  pageNum: {
    position: "absolute",
    bottom: 24,
    right: 40,
    fontSize: 7,
    color: "#8c959f",
  },

  // Notice box
  noticeBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fff5f5",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  noticeText: {
    fontSize: 9,
    color: "#cf222e",
    fontFamily: "Helvetica-Bold",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) => n.toLocaleString();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const Footer = ({ title }: { title: string }) => (
  <>
    <Text style={S.footer}>CodeSangam Arena — {title} — Confidential</Text>
    <Text
      style={S.pageNum}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      fixed
    />
  </>
);

// ---------------------------------------------------------------------------
// ContestReportPDF
// ---------------------------------------------------------------------------
interface Props {
  data: ContestReportData;
}

export const ContestReportPDF: React.FC<Props> = ({ data }) => {
  const { contest, statistics, leaderboard, problemAnalytics } = data;
  const generatedDate = fmtDate(new Date().toISOString());
  const top3 = leaderboard.slice(0, 3);
  const totalViolatingStudents = leaderboard.filter((e) => e.warnings > 0).length;

  return (
    <Document
      title={`${contest.title} — Contest Report`}
      author="CodeSangam Arena"
      subject="Post-Contest Analytics Report"
    >
      {/* ═══════════════════════════════ PAGE 1: COVER ══════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.coverPage}>
          <Text style={S.coverTitle}>{contest.title}</Text>
          <Text style={S.coverSubtitle}>Contest Performance Report</Text>

          <Text style={[S.coverMeta, { marginTop: 28 }]}>{fmtDate(contest.created_at)}</Text>
          <Text style={S.coverMeta}>Duration: {contest.duration_minutes} minutes</Text>
          <Text style={S.coverMeta}>
            Total Participants: {fmt(statistics.totalParticipants)}
          </Text>
          <Text style={S.coverMeta}>
            Problems: {fmt(problemAnalytics.length)}
          </Text>

          <Text style={S.coverGenerated}>Generated on {generatedDate}</Text>
        </View>

        <Footer title={contest.title} />
      </Page>

      {/* ═══════════════════════════ PAGE 2: EXEC SUMMARY ═══════════════════ */}
      <Page size="A4" style={S.page}>
        {/* Statistics */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Executive Summary</Text>

          <View style={S.statsRow}>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Total Participants</Text>
              <Text style={S.statValue}>{fmt(statistics.totalParticipants)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Average Score</Text>
              <Text style={S.statValue}>{fmt(statistics.averageScore)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Completion Rate</Text>
              <Text style={S.statValue}>{statistics.completionRate}%</Text>
            </View>
          </View>

          <View style={S.statsRow}>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Active Students</Text>
              <Text style={S.statValue}>{fmt(statistics.activeParticipants)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Median Score</Text>
              <Text style={S.statValue}>{fmt(statistics.medianScore)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Disqualified</Text>
              <Text style={S.statValueDanger}>{fmt(statistics.disqualifiedCount)}</Text>
            </View>
          </View>
        </View>

        {/* Top 3 performers */}
        {top3.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Top Performers</Text>
            <View style={S.table}>
              <View style={[S.tableRow, S.tableHeader]}>
                <Text style={S.cell}>Rank</Text>
                <Text style={S.cellWide}>Username</Text>
                <Text style={S.cell}>Score</Text>
                <Text style={S.cell}>Solved</Text>
                <Text style={S.cell}>Time</Text>
              </View>
              {top3.map((entry, i) => {
                const medal = i === 0 ? "1st" : i === 1 ? "2nd" : "3rd";
                const isLast = i === top3.length - 1;
                return (
                  <View
                    key={entry.session_id}
                    style={[
                      isLast ? S.tableRowLast : S.tableRow,
                      i % 2 === 1 ? S.tableRowAlt : {},
                    ]}
                  >
                    <Text style={S.cellBold}>{medal}</Text>
                    <Text style={[S.cellWide, { fontFamily: "Helvetica-Bold" }]}>
                      {entry.username}
                    </Text>
                    <Text style={S.cell}>{fmt(entry.total_score)}</Text>
                    <Text style={S.cell}>{entry.problems_solved}</Text>
                    <Text style={S.cell}>{fmtTime(entry.total_time_seconds)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Footer title={contest.title} />
      </Page>

      {/* ═══════════════════════════ PAGE 3: PROBLEM ANALYTICS ══════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Problem Analytics</Text>
          <View style={S.table}>
            <View style={[S.tableRow, S.tableHeader]}>
              <Text style={S.cellWide}>Problem</Text>
              <Text style={S.cell}>Submissions</Text>
              <Text style={S.cellGreen}>Accepted</Text>
              <Text style={S.cell}>Partial</Text>
              <Text style={S.cellRed}>Failed</Text>
              <Text style={S.cell}>Avg Score</Text>
              <Text style={S.cell}>Solve Rate</Text>
            </View>
            {problemAnalytics.map((p, i) => {
              const isLast = i === problemAnalytics.length - 1;
              return (
                <View
                  key={p.problem_id}
                  style={[
                    isLast ? S.tableRowLast : S.tableRow,
                    i % 2 === 1 ? S.tableRowAlt : {},
                  ]}
                >
                  <Text style={S.cellWide}>{p.problem_title}</Text>
                  <Text style={S.cell}>{fmt(p.total_submissions)}</Text>
                  <Text style={S.cellGreen}>{fmt(p.accepted_submissions)}</Text>
                  <Text style={S.cell}>{fmt(p.partial_submissions)}</Text>
                  <Text style={S.cellRed}>{fmt(p.failed_submissions)}</Text>
                  <Text style={S.cell}>{fmt(p.average_score)}</Text>
                  <Text style={S.cell}>{p.solve_rate}%</Text>
                </View>
              );
            })}
          </View>
        </View>
        <Footer title={contest.title} />
      </Page>

      {/* ═══════════════════════════ PAGE 4: FULL LEADERBOARD ═══════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Complete Leaderboard</Text>
          <View style={S.table}>
            <View style={[S.tableRow, S.tableHeader]}>
              <Text style={S.cell}>Rank</Text>
              <Text style={S.cellWide}>Username</Text>
              <Text style={S.cell}>Score</Text>
              <Text style={S.cell}>Solved</Text>
              <Text style={S.cell}>Time</Text>
              <Text style={S.cell}>Warnings</Text>
              <Text style={S.cell}>Status</Text>
            </View>
            {leaderboard.map((entry, i) => {
              const isLast = i === leaderboard.length - 1;
              return (
                <View
                  key={entry.session_id}
                  style={[
                    isLast ? S.tableRowLast : S.tableRow,
                    i % 2 === 1 ? S.tableRowAlt : {},
                  ]}
                >
                  <Text style={S.cell}>{entry.rank}</Text>
                  <Text style={S.cellWide}>{entry.username}</Text>
                  <Text style={S.cell}>{fmt(entry.total_score)}</Text>
                  <Text style={S.cell}>{entry.problems_solved}</Text>
                  <Text style={S.cell}>{fmtTime(entry.total_time_seconds)}</Text>
                  <Text
                    style={entry.warnings > 0 ? S.cellRed : S.cellMuted}
                  >
                    {entry.warnings}
                  </Text>
                  <Text style={entry.is_disqualified ? S.cellRed : S.cellGreen}>
                    {entry.is_disqualified ? "DQ" : "Active"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        <Footer title={contest.title} />
      </Page>

      {/* ═══════════════════════════ PAGE 5: ANTI-CHEAT SUMMARY ═════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.section}>
          <Text style={S.sectionTitle}>Anti-Cheat Summary</Text>

          <View style={S.statsRow}>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Total Warnings Issued</Text>
              <Text style={S.statValueDanger}>{fmt(statistics.totalWarnings)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Students with Warnings</Text>
              <Text style={S.statValue}>{fmt(totalViolatingStudents)}</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statLabel}>Disqualified</Text>
              <Text style={S.statValueDanger}>{fmt(statistics.disqualifiedCount)}</Text>
            </View>
          </View>

          {/* Per-student warning breakdown (top violators) */}
          {totalViolatingStudents > 0 && (
            <>
              <Text
                style={{ fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8 }}
              >
                Students with Warnings (ranked by warning count)
              </Text>
              <View style={S.table}>
                <View style={[S.tableRow, S.tableHeader]}>
                  <Text style={S.cellWide}>Username</Text>
                  <Text style={S.cell}>Warnings</Text>
                  <Text style={S.cell}>Score</Text>
                  <Text style={S.cell}>Status</Text>
                </View>
                {leaderboard
                  .filter((e) => e.warnings > 0)
                  .sort((a, b) => b.warnings - a.warnings)
                  .map((entry, i, arr) => {
                    const isLast = i === arr.length - 1;
                    return (
                      <View
                        key={entry.session_id}
                        style={[
                          isLast ? S.tableRowLast : S.tableRow,
                          i % 2 === 1 ? S.tableRowAlt : {},
                        ]}
                      >
                        <Text style={S.cellWide}>{entry.username}</Text>
                        <Text style={S.cellRed}>{entry.warnings}</Text>
                        <Text style={S.cell}>{fmt(entry.total_score)}</Text>
                        <Text
                          style={entry.is_disqualified ? S.cellRed : S.cellGreen}
                        >
                          {entry.is_disqualified ? "Disqualified" : "Active"}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </>
          )}

          {statistics.disqualifiedCount > 0 && (
            <View style={S.noticeBox}>
              <Text style={S.noticeText}>
                ⚠ {statistics.disqualifiedCount} student
                {statistics.disqualifiedCount > 1 ? "s were" : " was"} disqualified
                for exceeding the 15-warning anti-cheat threshold.
              </Text>
            </View>
          )}

          {statistics.totalWarnings === 0 && (
            <View
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: "#f0fff4",
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#c3e6cb",
              }}
            >
              <Text
                style={{ fontSize: 9, color: "#1a7f37", fontFamily: "Helvetica-Bold" }}
              >
                ✓ No anti-cheat violations were recorded during this contest.
              </Text>
            </View>
          )}
        </View>
        <Footer title={contest.title} />
      </Page>
    </Document>
  );
};
