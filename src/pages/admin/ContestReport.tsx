import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useContestReport } from "@/hooks/useContestReport";
import { ContestReportPDF } from "@/components/reports/ContestReportPDF";
import {
  Download,
  Eye,
  Loader2,
  FileText,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";

export default function ContestReport() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useContestReport(contestId!);
  const [activeTab, setActiveTab] = useState("preview");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground text-sm">
          Generating report data…
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-semibold text-destructive mb-2">
              Failed to load report
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeName = data.contest.title.replace(/[^a-z0-9]/gi, "_");
  const fileName = `${safeName}_Report.pdf`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto p-6 flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">
                Report:{" "}
                <span className="text-primary">{data.contest.title}</span>
              </h1>
            </div>
          </div>

          <PDFDownloadLink
            document={<ContestReportPDF data={data} />}
            fileName={fileName}
          >
            {({ loading }) => (
              <Button disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </PDFDownloadLink>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Participants",
              value: data.statistics.totalParticipants,
              color: "text-foreground",
            },
            {
              label: "Avg Score",
              value: data.statistics.averageScore,
              color: "text-primary",
            },
            {
              label: "Completion",
              value: `${data.statistics.completionRate}%`,
              color: "text-success",
            },
            {
              label: "Disqualified",
              value: data.statistics.disqualifiedCount,
              color:
                data.statistics.disqualifiedCount > 0
                  ? "text-destructive"
                  : "text-muted-foreground",
            },
          ].map(({ label, value, color }) => (
            <Card key={label} className="py-3">
              <CardContent className="px-4 py-0 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs: Preview / Raw Data */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-0">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  PDF Preview
                </TabsTrigger>
                <TabsTrigger value="data">
                  <FileText className="mr-2 h-4 w-4" />
                  Raw Data
                </TabsTrigger>
              </TabsList>

              <CardContent className="pt-4 pb-4 flex-1 min-h-0">
                <TabsContent
                  value="preview"
                  className="mt-0 h-[calc(100vh-340px)] min-h-[400px]"
                >
                  <div className="h-full rounded-lg border border-border overflow-hidden">
                    <PDFViewer width="100%" height="100%" showToolbar>
                      <ContestReportPDF data={data} />
                    </PDFViewer>
                  </div>
                </TabsContent>

                <TabsContent
                  value="data"
                  className="mt-0 h-[calc(100vh-340px)] min-h-[400px] overflow-auto"
                >
                  <pre className="text-xs p-4 bg-muted rounded-lg leading-relaxed h-full overflow-auto">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </TabsContent>
              </CardContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
