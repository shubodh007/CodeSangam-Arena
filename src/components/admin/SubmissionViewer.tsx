import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubmissionDetail } from '@/hooks/useAdminSubmissions';
import { AdminSubmissionView } from '@/types/admin';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Code2,
  User,
  TrendingUp,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SubmissionViewerProps {
  submissionId: string | null;
  onClose: () => void;
}

export function SubmissionViewer({ submissionId, onClose }: SubmissionViewerProps) {
  const { data, isLoading } = useSubmissionDetail(submissionId);
  const [activeTab, setActiveTab] = useState('code');

  if (!submissionId) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      accepted: 'default',
      partial: 'secondary',
      failed: 'destructive',
      error: 'destructive',
    };
    return (
      <Badge variant={variants[status] ?? 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const sub = data?.submission;

  return (
    <Dialog open={!!submissionId} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Submission Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : sub ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">History ({data.history.length})</TabsTrigger>
            </TabsList>

            {/* Code tab */}
            <TabsContent value="code" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted rounded-lg shrink-0">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-medium">{sub.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(sub.status)}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    {getStatusBadge(sub.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="font-medium">
                      {sub.score ?? 0}/{sub.problem_max_score}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Language</p>
                    <p className="font-medium">{sub.language}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                <Editor
                  height="100%"
                  language={sub.language}
                  value={sub.code}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    scrollbar: { vertical: 'visible', horizontal: 'visible' },
                  }}
                />
              </div>

              <Button
                variant="outline"
                className="mt-4 shrink-0"
                onClick={() => navigator.clipboard.writeText(sub.code)}
              >
                Copy Code
              </Button>
            </TabsContent>

            {/* Details tab */}
            <TabsContent value="details" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-6 p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Problem Information</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Contest</p>
                        <p className="font-medium">{sub.contest_title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Problem</p>
                        <p className="font-medium">{sub.problem_title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Max Score</p>
                        <p className="font-medium">{sub.problem_max_score}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Language</p>
                        <p className="font-medium">{sub.language}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Student Information</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Username</p>
                        <p className="font-medium">{sub.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Warnings</p>
                        <p className="font-medium">{sub.warnings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Disqualified</p>
                        <p className="font-medium">{sub.is_disqualified ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Attempt Number</p>
                        <p className="font-medium">#{sub.attempt_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Submission Details</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="mt-1">{getStatusBadge(sub.status)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="font-medium">
                          {sub.score ?? 0}/{sub.problem_max_score}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Code Length</p>
                        <p className="font-medium">{sub.code_length} characters</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted At</p>
                        <p className="font-medium">
                          {format(new Date(sub.submitted_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history" className="flex-1 min-h-0 mt-4">
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4">
                  <h3 className="font-semibold text-lg mb-4">Submission History</h3>
                  {data.history.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 border rounded-lg',
                        item.id === submissionId && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Attempt #{data.history.length - index}
                          </span>
                          {getStatusBadge(item.status)}
                          {item.id === submissionId && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(item.submitted_at), 'PPp')}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Score: </span>
                        <span className="font-medium">{item.score ?? 0}</span>
                      </div>
                    </div>
                  ))}
                  {data.history.length === 0 && (
                    <p className="text-muted-foreground text-sm">No history found.</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No submission data found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
