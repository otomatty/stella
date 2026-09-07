/**
 * 殿堂の運用画面 — 管理者だけ (Phase 5)。
 *
 * できるのは 4 つだけ: **推薦する / 状態を眺める / 申請された内容を読む / 公開・非公開**。
 * 本文を直す口はここに無い (API にも無い) — 管理者が書き足せると、公開されるのは
 * 「本人が書いたもの」ではなくなる。
 *
 * 候補の一覧は表示名順で、学習実績では並べない。選出条件は非公開のままにする、
 * という設計をこの画面でも守る (実績順に並べた候補一覧は条件の答え合わせになる)。
 *
 * ## 読めるのは「申請された内容」だけ
 *
 * 記入中 (`nominated`) の下書きと、降りた人 (`declined` / `withdrawn`) の文章は
 * **API がそもそも返さない** (`routes/cms-hall-of-fame.ts` の `staffPayload`)。この画面が
 * 伏せているのではないので、ジョブ欄が空なのは「まだ書いていない」ではなく
 * 「まだ運営が読んでよい段階ではない」。記入画面が「下書きはこの時点では誰にも
 * 見えません」と約束している以上、ここに途中の文章が流れてはならない。
 *
 * ## 辞退した人は一覧から分ける
 *
 * 辞退の一覧は既定で畳んでおく。運営が日々見るのは「今どこまで進んでいるか」で、
 * 断った人の名前がその横に常時並ぶ必要は無い。それでも **実名は残す** — 同じ人へ
 * 招待を送り直さない (`nominate` は 409 を返す) ことを運営が確かめられる必要があり、
 * ここを伏せると「なぜ推薦できないのか」が画面から読めなくなるため。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { HallOfFameStatus } from "@stella/shared/hall-of-fame/types";

import { Search } from "@/lib/icons";
import { isBackendConfigured } from "@/lib/backend";
import {
  getHallOfFameOverview,
  nominateHallOfFame,
  publishHallOfFame,
  unpublishHallOfFame,
  type HallOfFameAdminRow,
  type HallOfFameCandidate,
} from "@/lib/hall-of-fame-api";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HallOfFameStory } from "@/components/hall-of-fame/HallOfFameDetail";
import { HofSurface } from "@/components/hall-of-fame/hof-ui";

const STATUS_META: Record<
  HallOfFameStatus,
  { label: string; variant: "default" | "info" | "success" | "warning" }
> = {
  nominated: { label: "招待中", variant: "default" },
  submitted: { label: "申請あり", variant: "info" },
  published: { label: "掲載中", variant: "success" },
  declined: { label: "辞退", variant: "default" },
  withdrawn: { label: "取り下げ", variant: "default" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 候補の一覧に出す上限。これを超えたぶんは検索で絞ってもらう。 */
const CANDIDATE_LIMIT = 8;

/**
 * 「公開したあとで非公開に戻した」行か。
 *
 * 非公開化の行き先は `submitted` (本人の同意はそのまま) なので、状態だけでは
 * 「まだ一度も公開していない申請」と見分けが付かない。公開した時刻が残っている
 * ことがその印になる。
 */
function wasUnpublished(row: HallOfFameAdminRow): boolean {
  return row.status === "submitted" && row.published_at !== null;
}

export function AdminHallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameAdminRow[]>([]);
  const [candidates, setCandidates] = useState<HallOfFameCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<HallOfFameAdminRow | null>(null);

  const load = useCallback(async () => {
    if (!isBackendConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const data = await getHallOfFameOverview();
      setEntries(data.entries);
      setCandidates(data.candidates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 候補は先頭 8 件だけ出す。何件が隠れているかは画面に書く (黙って切らない)。 */
  const { shown, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? candidates.filter(
          (row) =>
            row.name.toLowerCase().includes(q) || (row.email ?? "").toLowerCase().includes(q),
        )
      : candidates;
    return {
      shown: matched.slice(0, CANDIDATE_LIMIT),
      hidden: Math.max(0, matched.length - CANDIDATE_LIMIT),
    };
  }, [candidates, query]);

  /**
   * 辞退した行は本表から外す。
   *
   * 運営が日々追うのは「今どこまで進んでいるか」で、断った人の名前がその横に常時
   * 並ぶ必要は無い。ただし消しはしない — 同じ人を推薦できない (409) 理由が画面から
   * 読めなくなるため、畳んだ節に実名だけを残す。
   */
  const activeEntries = useMemo(
    () => entries.filter((row) => row.status !== "declined"),
    [entries],
  );
  const declinedEntries = useMemo(
    () => entries.filter((row) => row.status === "declined"),
    [entries],
  );

  const run = useCallback(
    async (op: () => Promise<unknown>, done: string) => {
      setBusy(true);
      setError(null);
      try {
        await op();
        await load();
        toast.success(done);
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作に失敗しました");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  /**
   * ダイアログで読んでいる行が公開できるか + **読んでいる版** (`submitted_at`)。
   *
   * 公開ボタンはこの版を添えて送る。本人は公開されるまで何度でも出し直せるので、
   * 読んだ版と今の版が食い違えばサーバが 409 で止める (読んでいない文章を公開して
   * しまう経路を残さない)。
   */
  const publishable =
    preview?.status === "submitted" && preview.submitted_at
      ? { id: preview.id, expected: preview.submitted_at }
      : null;

  return (
    <>
      <PageHeader
        title="殿堂"
        sub="運営が学習実績をもとに選出し、本人が承諾した場合にだけ公開されます。選出条件は画面には出しません。"
      />

      {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>受講者を推薦する</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
              />
              <Input
                className="pl-8"
                placeholder="氏名 / メールで検索"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="text-[11.5px] text-ink-3">
              推薦すると本人に招待が届きます。掲載されるのは、本人が内容を書いて申請し、
              運営がここで公開したときだけです。
            </p>
            {loading ? <Skeleton className="h-10 w-full" /> : null}
            {!loading && shown.length === 0 ? (
              <p className="text-[12.5px] text-ink-3">
                {candidates.length === 0
                  ? "推薦できる受講者がいません (すでに全員へ招待を送っています)。"
                  : "一致する受講者がいません。"}
              </p>
            ) : null}
            <ul className="flex flex-col divide-y divide-border">
              {shown.map((candidate) => (
                <li key={candidate.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{candidate.name}</div>
                    <div className="text-[11.5px] text-ink-3 truncate">{candidate.email ?? ""}</div>
                  </div>
                  <Button
                    className="ml-auto"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => nominateHallOfFame(candidate.id), "推薦しました")}
                  >
                    推薦する
                  </Button>
                </li>
              ))}
            </ul>
            {hidden > 0 ? (
              <p className="text-[11.5px] text-ink-3">他 {hidden} 件は検索で絞ってください。</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>招待と掲載の状況</CardTitle>
          </CardHeader>
          <CardContent flush>
            {loading ? (
              <div className="p-4">
                <Skeleton className="h-24 w-full" />
              </div>
            ) : activeEntries.length === 0 ? (
              <p className="p-4 text-[12.5px] text-ink-3">
                {entries.length === 0 ? "まだ誰も推薦していません。" : "進行中の招待はありません。"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>受講者</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>ジョブ</TableHead>
                    <TableHead>推薦</TableHead>
                    <TableHead>申請</TableHead>
                    <TableHead>公開</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEntries.map((row) => {
                    const meta = STATUS_META[row.status];
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            {/* 非公開化の行き先は submitted なので、状態だけでは
                                「一度も公開していない申請」と見分けが付かない。 */}
                            {wasUnpublished(row) ? (
                              <Badge variant="warning">公開後に非公開化</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        {/* 申請前の行は API がジョブを返さない (下書きは運営にも見せない)。 */}
                        <TableCell className="text-ink-2">{row.job_title || "—"}</TableCell>
                        <TableCell className="text-ink-3">{formatDate(row.nominated_at)}</TableCell>
                        <TableCell className="text-ink-3">{formatDate(row.submitted_at)}</TableCell>
                        <TableCell className="text-ink-3">
                          {wasUnpublished(row)
                            ? `${formatDate(row.published_at)} → ${formatDate(row.closed_at)} 非公開`
                            : formatDate(row.published_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {row.status === "submitted" || row.status === "published" ? (
                              <Button variant="ghost" size="sm" onClick={() => setPreview(row)}>
                                内容を読む
                              </Button>
                            ) : null}
                            {row.status === "published" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() =>
                                  void run(
                                    () => unpublishHallOfFame(row.id),
                                    "掲載を非公開にしました",
                                  )
                                }
                              >
                                非公開にする
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {declinedEntries.length > 0 ? (
          <Collapsible>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <CollapsibleTrigger className="text-left text-[13px] font-medium">
                  辞退 ({declinedEntries.length} 名・再推薦不可)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-[11.5px] text-ink-3">
                    招待を断った方です。書きかけの文章は残っていません (API も返しません)。
                    同じ方へ招待を送り直すことはできないため、
                    「なぜ推薦候補に出てこないのか」が分かるように実名だけを残しています。
                  </p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {declinedEntries.map((row) => (
                      <li key={row.id} className="text-[12px] text-ink-3">
                        {row.name}
                        <span className="text-ink-3/70"> ({formatDate(row.closed_at)})</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        ) : null}
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => (open ? null : setPreview(null))}>
        <DialogContent className="w-[min(calc(100vw-2rem),760px)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {preview?.name} さんの掲載内容
              {preview?.status === "published" ? " (掲載中)" : " (申請)"}
            </DialogTitle>
          </DialogHeader>
          {preview ? (
            <HofSurface>
              <HallOfFameStory
                name={preview.name}
                initials={preview.initials}
                jobTitle={preview.job_title}
                quote={preview.quote}
                chapters={preview.chapters}
                path={preview.path_snapshot}
              />
            </HofSurface>
          ) : null}
          <DialogFooter>
            <Button variant="default" onClick={() => setPreview(null)}>
              閉じる
            </Button>
            {publishable ? (
              <Button
                variant="accent"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  void run(
                    () => publishHallOfFame(publishable.id, publishable.expected),
                    "殿堂に公開しました",
                  );
                }}
              >
                この内容で公開する
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
