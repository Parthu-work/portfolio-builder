"use client";

import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { closestEdge, restrictToVerticalAxis } from "./modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Handle = ButtonHTMLAttributes<HTMLButtonElement> & { ref: (el: HTMLElement | null) => void };

function Row({ id, children, className }: { id: string; children: (handle: ReactNode, dragging: boolean) => ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Reorder (press space, then arrow keys)"
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-dim hover:bg-panel2 hover:text-fg active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  );
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(className, isDragging && "relative z-10 opacity-80 shadow-lg")}>
      {children(handle, isDragging)}
    </li>
  );
}

/** Drag-and-drop list (pointer + fully keyboard operable: focus the grip, Space, arrows, Space). */
export function SortableList<T>({
  items,
  getId,
  onMove,
  children,
  className,
  itemClassName,
  label,
}: {
  items: T[];
  getId: (item: T) => string;
  onMove: (from: number, to: number) => void;
  children: (item: T, index: number, handle: ReactNode) => ReactNode;
  className?: string;
  itemClassName?: string;
  label: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map(getId);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestEdge} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className} aria-label={label}>
          {items.map((item, i) => (
            <Row key={getId(item)} id={getId(item)} className={itemClassName}>
              {(handle) => children(item, i, handle)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export { arrayMove };
