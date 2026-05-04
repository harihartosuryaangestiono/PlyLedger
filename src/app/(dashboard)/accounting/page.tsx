import { getJournalEntries, getAuditLogs } from "./actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AccountingPage() {
  const [journals, audits] = await Promise.all([
    getJournalEntries(),
    getAuditLogs()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Accounting & Audit Logs</h2>
        <p className="text-muted-foreground">Immutable journal entries and system audit trail.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center">No entries found.</TableCell></TableRow>
                )}
                {journals.map((j: any) => (
                  <TableRow key={j.id}>
                    <TableCell>{new Date(j.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{j.account}</TableCell>
                    <TableCell className={j.type === "CREDIT" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{j.type}</TableCell>
                    <TableCell className="text-right">Rp {j.amount.toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center">No audit logs found.</TableCell></TableRow>
                )}
                {audits.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{a.user.name}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.entity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
