import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminSubmissions, useSubmissionStats } from '@/hooks/useAdminSubmissions';
import { SubmissionViewer } from '@/components/admin/SubmissionViewer';
import { ChevronLeft, Eye, Download, Filter, FileCode2 } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function SubmissionsList() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  const { data: submissionsData, isLoading, isError, error } = useAdminSubmissions({
    contestId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: statsData } = useSubmissionStats(contestId ?? null);

  // Client-side search filter (username / problem title)
  const filteredSubmissions = submissionsData?.submissions.filter(
    (sub) =>
      sub.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.problem_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      accepted: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
      partial: { variant: 'secondary', className: 'bg-yellow-500 text-white hover:bg-yellow-600' },
      failed: { variant: 'destructive' },
      error: { variant: 'destructive' },
    };
    const { variant, className } = config[status] ?? { variant: 'outline' };
    return (
      <Badge variant={variant} className={className}>
        {status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (!submissionsData?.submissions.length) return;

    const headers = [
      'Username',
      'Problem',
      'Status',
      'Score',
      'Language',
      'Code Length',
      'Submitted At',
    ];

    const rows = submissionsData.submissions.map((sub) => [
      sub.username,
      sub.problem_title,
      sub.status,
      sub.score ?? 0,
      sub.language,
      sub.code_length,
      format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions_${contestId}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalShown = filteredSubmissions?.length ?? 0;
  const totalAll = submissionsData?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border header-glass sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/contest/${contestId}/leaderboard`)}
            >
              <ChevronLeft size={16} /> Back
            </Button>
            <div className="flex items-center gap-2">
              <FileCode2 size={20} className="text-primary" />
              <h1 className="text-lg font-bold">Submission Management</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!submissionsData?.submissions.length}
          >
            <Download size={14} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Statistics Cards */}
        {statsData?.stats && statsData.stats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsData.stats.map((stat) => (
              <Card key={stat.problem_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium truncate" title={stat.problem_title}>
                    {stat.problem_title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.total_submissions}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.unique_students} students &middot; Avg score:{' '}
                    {stat.average_score ?? '—'}
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {stat.accepted_submissions > 0 && (
                      <Badge variant="default" className="text-[10px] bg-green-600">
                        {stat.accepted_submissions} AC
                      </Badge>
                    )}
                    {stat.partial_submissions > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {stat.partial_submissions} partial
                      </Badge>
                    )}
                    {stat.failed_submissions > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {stat.failed_submissions} failed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter size={16} />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Input
              placeholder="Search by username or problem..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="max-w-sm"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Submissions ({totalAll})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : isError ? (
              <div className="py-12 text-center text-destructive space-y-2">
                <p className="font-medium">Failed to load submissions.</p>
                <p className="text-sm text-muted-foreground">
                  {(error as Error)?.message ?? 'An unexpected error occurred.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Make sure the database migration has been applied:{' '}
                  <code className="font-mono bg-muted px-1 rounded">supabase db push</code>
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Problem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions && filteredSubmissions.length > 0 ? (
                        filteredSubmissions.map((submission) => (
                          <TableRow key={submission.submission_id}>
                            <TableCell className="font-medium">
                              <span className={submission.is_disqualified ? 'line-through text-muted-foreground' : ''}>
                                {submission.username}
                              </span>
                              {submission.is_disqualified && (
                                <Badge variant="destructive" className="ml-2 text-[10px]">
                                  DQ
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate" title={submission.problem_title}>
                              {submission.problem_title}
                            </TableCell>
                            <TableCell>{getStatusBadge(submission.status)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {submission.score ?? 0}/{submission.problem_max_score}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {submission.language}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {format(new Date(submission.submitted_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSubmissionId(submission.submission_id)}
                              >
                                <Eye size={15} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                            {searchQuery || statusFilter !== 'all'
                              ? 'No submissions match the current filters.'
                              : 'No submissions found for this contest.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {totalAll > 0
                      ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalAll)} of ${totalAll}`
                      : 'No results'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={(page + 1) * PAGE_SIZE >= totalAll}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <SubmissionViewer
        submissionId={selectedSubmissionId}
        onClose={() => setSelectedSubmissionId(null)}
      />
    </div>
  );
}
