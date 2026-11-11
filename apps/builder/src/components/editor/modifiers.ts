import type { CollisionDetection, Modifier } from "@dnd-kit/core";

export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * Collision detection for vertical lists whose rows have very different
 * heights (an expanded section next to collapsed ones). The stock
 * closest-centre strategy leaves a tall row "over itself" when it is moved
 * by keyboard; comparing top and bottom edges instead works for any height,
 * because keyboard moves align the dragged row's top (moving up) or bottom
 * (moving down) with its target.
 */
export const closestEdge: CollisionDetection = ({ collisionRect, droppableRects, droppableContainers }) => {
  const bottom = collisionRect.top + collisionRect.height;
  const collisions = [];
  for (const container of droppableContainers) {
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const value = Math.min(Math.abs(rect.top - collisionRect.top), Math.abs(rect.top + rect.height - bottom));
    collisions.push({ id: container.id, data: { droppableContainer: container, value } });
  }
  return collisions.sort((a, b) => a.data.value - b.data.value);
};
