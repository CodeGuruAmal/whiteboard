import React, { useEffect, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import { useDispatch, useSelector } from "react-redux";
import {
  addToUndoStack,
  setIsDrawing,
  setRedo,
  setShapes,
  setUndo,
} from "../../utils/drawSlice";
import ShapeRenderer from "./ShapeRenderer";
import { setMenuClick, setToolSelected } from "../../utils/controlSlice";
import { BiMinus, BiPlus, BiRedo, BiUndo } from "react-icons/bi";
import { useSetting } from "../../context/SettingContext";

const Canvas = () => {
  const dispatch = useDispatch();
  const toolSelected = useSelector((state) => state.control.toolSelected);
  const shapes = useSelector((state) => state.draw.shapes);
  const isDrawing = useSelector((state) => state.draw.isDrawing);
  const undoStack = useSelector((state) => state.draw.undoStack);
  const redoStack = useSelector((state) => state.draw.redoStack);

  // console.log(undoStack)
  // console.log(redoStack)

  const { strokeColor, strokeWidth, strokeStyle, fillColor } = useSetting();

  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const transformerRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);

  const zoomPercentage = Math.round(stageScale * 100);

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const direction = e.evt.deltaY < 0 ? scaleBy : 1 / scaleBy;
    const pointer = e.target.getStage().getPointerPosition();
    zoomStage(direction, pointer);
  };

  const zoomStage = (scaleFactor, pointer) => {
    const oldScale = stageScale;

    const newScale = oldScale * scaleFactor;
    const clampedScale = Math.max(0.1, Math.min(30, newScale));

    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    setStageScale(clampedScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const transformPointerPosition = (pointer) => ({
    x: (pointer.x - stagePosition.x) / stageScale,
    y: (pointer.y - stagePosition.y) / stageScale,
  });

  const handleStart = (e) => {
    // console.log(e.target.getStage().getPointerPosition());
    // console.log(e.evt)

    if (toolSelected !== "mouse") {
      dispatch(addToUndoStack());
      dispatch(setIsDrawing(true));
      const pointer = e.target.getStage().getPointerPosition();
      const { x, y } = transformPointerPosition(pointer);

      if (toolSelected === "pencil" && toolSelected !== "hand") {
        // Handle pencil drawing
        dispatch(
          setShapes([
            ...shapes,
            {
              id: shapes.length,
              points: [{ x, y }],
              type: toolSelected,
              strokeColor: strokeColor,
              strokeWidth: strokeWidth,
              rotation: 0,
            },
          ])
        );
      } else {
        dispatch(
          setShapes([
            ...shapes,
            {
              id: shapes.length,
              x,
              y,
              width: 0,
              height: 0,
              type: toolSelected,
              strokeColor: strokeColor,
              fillColor: fillColor,
              strokeWidth: strokeWidth,
              rotation: 0,
            },
          ])
        );
      }
    }
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    const pointer = e.target.getStage().getPointerPosition();
    const { x, y } = transformPointerPosition(pointer);
    const lastShape = shapes[shapes.length - 1];

    if (
      toolSelected !== "pencil" &&
      (lastShape.width === 0 ||
        lastShape.height === 0 ||
        lastShape.type === "hand")
    ) {
      dispatch(setShapes(shapes.slice(0, -1)));
    }

    const updatedShapes = shapes.map((shape, index) =>
      index === shapes.length - 1
        ? {
            ...shape,
            ...(toolSelected === "pencil"
              ? { points: [...shape.points, { x, y }] }
              : { width: x - shape.x, height: y - shape.y }),
          }
        : shape
    );

    dispatch(setShapes(updatedShapes));
  };

  const handleEnd = () => {
    dispatch(setIsDrawing(false));
    if (toolSelected !== "hand" && toolSelected !== "pencil") {
      dispatch(setToolSelected("mouse"));
    }
  };

  const handleUndo = () => dispatch(setUndo());
  const handleRedo = () => dispatch(setRedo());

  const handleShapeSelect = (node) => {
    setSelectedNode(node);
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.target.getStage()) {
      setSelectedNode(null);
    }
  };

  useEffect(() => {
    if (selectedNode) {
      transformerRef.current.nodes([selectedNode]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedNode]);

  const handleTransformEnd = (e) => {
    const node = e.target;

    const updatedShapes = shapes.map((shape) => {
      if (shape.id === selectedNode.index) {
        switch (shape.type) {
          case "rectangle":
            return {
              ...shape,
              x: node.x(),
              y: node.y(),
              width: node.width() * node.scaleX(),
              height: node.height() * node.scaleY(),
              rotation: node.rotation(),
            };

          case "ellipse":
            return {
              ...shape,
              x: node.x() - node.radiusX() * node.scaleX(),
              y: node.y() - node.radiusY() * node.scaleY(),
              width: node.radiusX() * 2 * node.scaleX(),
              height: node.radiusY() * 2 * node.scaleY(),
              rotation: node.rotation(),
            };

          default:
            return shape;
        }
      }

      return shape;
    });

    // Reset scale after transformation
    node.scaleX(1);
    node.scaleY(1);

    // Dispatch actions to update the state
    dispatch(addToUndoStack());
    dispatch(setShapes(updatedShapes));
  };

  // console.log(shapes)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedNode !== null
      ) {
        dispatch(addToUndoStack());

        const deletedShapes = shapes.filter(
          (_, index) => index !== selectedNode.index
        );

        dispatch(setShapes(deletedShapes));

        setSelectedNode(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNode]);

  return (
    <>
      <div className="flex items-center justify-center gap-3 absolute bottom-4 left-4 text-zinc-300 z-50">
        <div className="bg-[#232329] p-1 rounded-md flex items-center overflow-hidden">
          <button
            onClick={() =>
              zoomStage(1.02, {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              })
            }
            className="hover:bg-[#694a8b] p-2 rounded-md"
          >
            <BiPlus />
          </button>
          <span className="px-5 text-xs">{zoomPercentage}%</span>
          <button
            onClick={() =>
              zoomStage(1 / 1.02, {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
              })
            }
            className="hover:bg-[#694a8b] p-2 rounded-md"
          >
            <BiMinus />
          </button>
        </div>

        <div className="bg-[#232329] p-1 rounded-md flex gap-1 items-center overflow-hidden">
          <button
            onClick={() => {
              handleUndo();
              setSelectedNode(null);
            }}
            disabled={undoStack.length === 0}
            className={` bg-[#232329] p-2 rounded-md ${
              undoStack.length === 0
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-[#694a8b]"
            }`}
          >
            <BiUndo />
          </button>
          <button
            onClick={() => {
              handleRedo();
              setSelectedNode(null);
            }}
            disabled={redoStack.length === 0}
            className={` bg-[#232329] p-2 rounded-md ${
              redoStack.length === 0
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-[#694a8b]"
            }`}
          >
            <BiRedo />
          </button>
        </div>
      </div>
      <Stage
        className={`overflow-hidden bg-[#121212] ${
          toolSelected === "mouse" && "cursor-move"
        } ${toolSelected === "hand" && "cursor-grab"} ${
          toolSelected !== "hand" &&
          toolSelected !== "mouse" &&
          "cursor-crosshair"
        }`}
        onClick={(e) => {
          dispatch(setMenuClick(false));
          handleCanvasClick(e);
        }}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={toolSelected === "hand"}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          if (toolSelected === "hand") {
            setStagePosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          <ShapeRenderer onShapeSelect={handleShapeSelect} />
          <Transformer
            ref={transformerRef}
            onTransformEnd={(e) => handleTransformEnd(e)}
            visible={!!selectedNode}
            borderStroke="#b1afea"
            borderStrokeWidth={1}
            anchorStroke="#b1afea"
            anchorFill="#b1afea"
            anchorSize={7}
            anchorCornerRadius={2}
            padding={4}
          />
        </Layer>
      </Stage>
    </>
  );
};

export default Canvas;
