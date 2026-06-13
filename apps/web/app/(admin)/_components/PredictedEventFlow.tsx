"use client";

import type {
  EventListItem,
  RunProjectionDto,
  TaskProjectionDto,
} from "@new-cursor/orpc-contract";

import {
  buildPredictedEventFlow,
  type FlowNodeStatus,
  type PredictedFlowEdge,
  type PredictedFlowNode,
} from "./task-detail-helpers";

type Props = {
  task: Pick<TaskProjectionDto, "stage">;
  events: Pick<EventListItem, "eventType">[];
  runs?: Pick<RunProjectionDto, "status">[];
};

const NODE_WIDTH = 84;
const NODE_HEIGHT = 26;
const COL_GAP = 12;
const ROW_GAP = 22;
const PAD_X = 12;
const PAD_Y = 6;

const NODE_STYLES: Record<
  FlowNodeStatus,
  { fill: string; stroke: string; text: string; dash?: string }
> = {
  past: {
    fill: "rgba(16, 185, 129, 0.12)",
    stroke: "rgba(16, 185, 129, 0.45)",
    text: "rgb(110, 231, 183)",
  },
  current: {
    fill: "rgba(99, 102, 241, 0.15)",
    stroke: "rgb(99, 102, 241)",
    text: "rgb(165, 180, 252)",
  },
  predicted: {
    fill: "rgba(113, 113, 122, 0.12)",
    stroke: "rgba(113, 113, 122, 0.45)",
    text: "rgb(161, 161, 170)",
  },
  future: {
    fill: "transparent",
    stroke: "rgba(113, 113, 122, 0.35)",
    text: "rgba(161, 161, 170, 0.75)",
    dash: "3 2",
  },
};

export function PredictedEventFlow({ task, events, runs = [] }: Props) {
  const graph = buildPredictedEventFlow(task, events, runs);
  const maxCol = Math.max(...graph.nodes.map((node) => node.col));
  const maxRow = Math.max(...graph.nodes.map((node) => node.row));
  const width = PAD_X * 2 + maxCol * (NODE_WIDTH + COL_GAP) + NODE_WIDTH;
  const height = PAD_Y * 2 + maxRow * (NODE_HEIGHT + ROW_GAP) + NODE_HEIGHT;

  const nodeById = Object.fromEntries(
    graph.nodes.map((node) => [node.id, node]),
  );

  return (
    <div className="space-y-1.5">
      <div className="rounded-md border border-border/70 bg-background/40 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto w-full max-w-[220px]"
          role="img"
          aria-label="予想イベント分岐フロー"
        >
          <title>予想イベント分岐フロー</title>
          <defs>
            <marker
              id="flow-arrow"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(161, 161, 170, 0.6)" />
            </marker>
          </defs>
          {graph.edges.map((edge) => (
            <FlowEdge key={edge.id} edge={edge} nodeById={nodeById} />
          ))}
          {graph.nodes.map((node) => (
            <FlowNode key={node.id} node={node} />
          ))}
        </svg>
      </div>
      <FlowLegend />
    </div>
  );
}

function FlowNode({ node }: { node: PredictedFlowNode }) {
  const x = PAD_X + node.col * (NODE_WIDTH + COL_GAP);
  const y = PAD_Y + node.row * (NODE_HEIGHT + ROW_GAP);
  const style = NODE_STYLES[node.status];

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={6}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1}
        strokeDasharray={style.dash}
      />
      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEIGHT / 2 + 3}
        textAnchor="middle"
        fill={style.text}
        fontSize={9}
        fontWeight={500}
      >
        {node.label}
      </text>
    </g>
  );
}

function FlowEdge({
  edge,
  nodeById,
}: {
  edge: PredictedFlowEdge;
  nodeById: Record<string, PredictedFlowNode>;
}) {
  const from = nodeById[edge.from];
  const to = nodeById[edge.to];
  if (!from || !to) return null;

  const fromBox = nodeBox(from);
  const toBox = nodeBox(to);
  const { fromX, fromY, toX, toY, labelX, labelY } = connectionPoints(
    fromBox,
    toBox,
  );

  const path = buildEdgePath(fromBox, toBox, fromX, fromY, toX, toY);

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="rgba(161, 161, 170, 0.45)"
        strokeWidth={1}
        strokeDasharray={edge.style === "dashed" ? "4 3" : undefined}
        markerEnd="url(#flow-arrow)"
      />
      {edge.label ? (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill="rgba(161, 161, 170, 0.8)"
          fontSize={8}
        >
          {edge.label}
        </text>
      ) : null}
    </g>
  );
}

function nodeBox(node: PredictedFlowNode) {
  return {
    x: PAD_X + node.col * (NODE_WIDTH + COL_GAP),
    y: PAD_Y + node.row * (NODE_HEIGHT + ROW_GAP),
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    row: node.row,
    col: node.col,
  };
}

function buildEdgePath(
  from: ReturnType<typeof nodeBox>,
  to: ReturnType<typeof nodeBox>,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  if (from.col === to.col) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  if (from.row === to.row) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  const midY = (fromY + toY) / 2;
  return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
}

function connectionPoints(
  from: ReturnType<typeof nodeBox>,
  to: ReturnType<typeof nodeBox>,
) {
  if (from.col === to.col && from.row < to.row) {
    return {
      fromX: from.x + from.width / 2,
      fromY: from.y + from.height,
      toX: to.x + to.width / 2,
      toY: to.y,
      labelX: from.x + from.width / 2 + 10,
      labelY: (from.y + from.height + to.y) / 2,
    };
  }

  if (from.col === to.col && from.row > to.row) {
    return {
      fromX: from.x + from.width / 2,
      fromY: from.y,
      toX: to.x + to.width / 2,
      toY: to.y + to.height,
      labelX: from.x + from.width / 2 - 10,
      labelY: (from.y + to.y + to.height) / 2,
    };
  }

  if (from.row === to.row && from.col < to.col) {
    return {
      fromX: from.x + from.width,
      fromY: from.y + from.height / 2,
      toX: to.x,
      toY: to.y + to.height / 2,
      labelX: (from.x + from.width + to.x) / 2,
      labelY: from.y + from.height / 2 - 4,
    };
  }

  if (from.row === to.row && from.col > to.col) {
    return {
      fromX: from.x,
      fromY: from.y + from.height / 2,
      toX: to.x + to.width,
      toY: to.y + to.height / 2,
      labelX: (from.x + to.x + to.width) / 2,
      labelY: from.y + from.height / 2 - 4,
    };
  }

  if (from.row < to.row) {
    return {
      fromX: from.x + from.width / 2,
      fromY: from.y + from.height,
      toX: to.x + to.width / 2,
      toY: to.y,
      labelX: (from.x + from.width / 2 + to.x + to.width / 2) / 2,
      labelY: (from.y + from.height + to.y) / 2,
    };
  }

  return {
    fromX: from.x + from.width / 2,
    fromY: from.y,
    toX: to.x + to.width / 2,
    toY: to.y + to.height,
    labelX: (from.x + from.width / 2 + to.x + to.width / 2) / 2,
    labelY: (from.y + to.y + to.height) / 2,
  };
}

function FlowLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
      <LegendItem label="経過" tone="past" />
      <LegendItem label="現在" tone="current" />
      <LegendItem label="予想" tone="predicted" />
      <LegendItem label="未実装（将来）" tone="future" dashed />
    </div>
  );
}

function LegendItem({
  label,
  tone,
  dashed,
}: {
  label: string;
  tone: FlowNodeStatus;
  dashed?: boolean;
}) {
  const style = NODE_STYLES[tone];

  return (
    <span className="inline-flex items-center gap-1">
      <svg width="10" height="10" aria-hidden="true" focusable="false">
        <rect
          x={0.5}
          y={0.5}
          width={9}
          height={9}
          rx={2}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={1}
          strokeDasharray={dashed ? "2 2" : style.dash}
        />
      </svg>
      {label}
    </span>
  );
}
