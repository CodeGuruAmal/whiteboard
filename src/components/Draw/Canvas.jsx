import React, { useEffect, useRef, useState } from "react";
import { Layer, Shape, Stage, Transformer } from "react-konva";
import { useDispatch, useSelector } from "react-redux";
import {
  addToUndoStack,
  setIsDrag,
  setIsDrawing,
  setShapes,
} from "../../utils/drawSlice";
import ShapeRenderer from "./ShapeRenderer";
import { setMenuClick, setToolSelected } from "../../utils/controlSlice";
import { useGlobal } from "../../context/GlobalContext";
import { useZoom } from "../../hooks/useZoom";
import ControlPanel from "../Controls/ControlPanel";

const Canvas = () => {
  const dispatch = useDispatch();
  const toolSelected = useSelector((state) => state.control.toolSelected);
  const shapes = useSelector((state) => state.draw.shapes);
  const isDrawing = useSelector((state) => state.draw.isDrawing);

  const { strokeColor, strokeWidth, fillColor, selectedNode, setSelectedNode } = useGlobal();
  const transformerRef = useRef();

  const {
    stageScale,
    stagePosition,
    setStagePosition,
    transformPointerPosition,
    handleWheel,
  } = useZoom();

  const handleStart = (e) => {
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

  const handleEnd = (e) => {
    dispatch(setIsDrawing(false));
    if (toolSelected !== "hand" && toolSelected !== "pencil") {
      dispatch(setToolSelected("mouse"));
    }


  };

  const handleShapeSelect = (node) => {
    console.log(shapes)
    setSelectedNode(node);
    if (toolSelected === "mouse" && toolSelected !== "pencil") {
      dispatch(setIsDrag(true));
    }
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.target.getStage()) {
      setSelectedNode(null);
      dispatch(setIsDrag(false));
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

    node.scaleX(1);
    node.scaleY(1);

    dispatch(addToUndoStack());
    dispatch(setShapes(updatedShapes));
  };

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
      <ControlPanel />
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
