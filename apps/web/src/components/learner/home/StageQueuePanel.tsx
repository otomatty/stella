/**
 * 「次にやるリスト」— アクティブでないステージを自分で並べる待ち行列 (Phase 2)。
 *
 * 学習の正本ではなく本人のメモ。並べ替え (@dnd-kit) と削除、先頭から着手する導線だけ。
 * 並びの保存はサーバ (`PUT /api/stage-queue/mine/order`) が持つので、ここは
 * 楽観的に並べ替えてから送る (体感を優先し、失敗時は Hook 側が取り直す)。
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { GripVertical, Play, Trash } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardActions } from "@/components/ui/card";
import type { Stage } from "@/data/types";
import { cn } from "@/lib/utils";

interface StageQueuePanelProps {
  /** 並び順どおりのステージ id。 */
  queue: string[];
  stageById: (stageId: string) => Stage | undefined;
  onReorder: (stageIds: string[]) => void;
  onRemove: (stageId: string) => void;
  /** この 1 つに切り替える (確認ダイアログは呼び出し側が出す)。 */
  onStart: (stageId: string) => void;
  className?: string;
}

export const StageQueuePanel = ({
  queue,
  stageById,
  onReorder,
  onRemove,
  onStart,
  className,
}: StageQueuePanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.indexOf(String(active.id));
    const to = queue.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(queue, from, to));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>次にやるリスト</CardTitle>
        <CardActions>
          <span className="text-[11.5px] text-ink-3">{queue.length} 件</span>
        </CardActions>
      </CardHeader>
      {queue.length === 0 ? (
        <div className="px-4 py-4 text-[12.5px] text-ink-3">
          まだありません。ステージ一覧の「キューに追加」で、次にやるステージを積んでおけます。
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={queue} strategy={verticalListSortingStrategy}>
            <ul>
              {queue.map((stageId, i) => (
                <QueueRow
                  key={stageId}
                  stageId={stageId}
                  index={i}
                  title={stageById(stageId)?.title ?? "割当が外れたステージ"}
                  category={stageById(stageId)?.category ?? ""}
                  last={i === queue.length - 1}
                  onRemove={onRemove}
                  onStart={onStart}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
};

interface QueueRowProps {
  stageId: string;
  index: number;
  title: string;
  category: string;
  last: boolean;
  onRemove: (stageId: string) => void;
  onStart: (stageId: string) => void;
}

const QueueRow = ({ stageId, index, title, category, last, onRemove, onStart }: QueueRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stageId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 bg-card",
        last ? "" : "border-b border-border",
        isDragging ? "relative z-10 shadow-sm" : "",
      )}
    >
      <button
        type="button"
        className="text-ink-4 hover:text-ink-2 cursor-grab touch-none"
        aria-label={`${title} を並べ替え`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className="text-[11.5px] text-ink-3 tabular-nums w-4">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug truncate">{title}</div>
        {category ? <div className="text-[11.5px] text-ink-3">{category}</div> : null}
      </div>
      <Button size="sm" variant="default" onClick={() => onStart(stageId)}>
        <Play size={12} />
        始める
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`${title} をリストから外す`}
        onClick={() => onRemove(stageId)}
      >
        <Trash size={13} />
      </Button>
    </li>
  );
};
