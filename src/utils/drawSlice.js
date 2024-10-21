import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  shapes: [],
  isDrawing: false,
  undoStack: [],
  redoStack: [],
  isDrag: false,
  selectedShapeId: null
};

const drawSlice = createSlice({
  name: "draw",
  initialState,
  reducers: {
    setShapes: (state, action) => {
      state.shapes = action.payload;
    },
    setIsDrawing: (state, action) => {
      state.isDrawing = action.payload;
    },
    setUndo: (state) => {
      if (state.undoStack.length > 0) {
        state.redoStack.push(state.shapes);
        state.shapes = state.undoStack.pop();
      }
    },
    setRedo: (state) => {
      if (state.redoStack.length > 0) {
        state.undoStack.push(state.shapes);
        state.shapes = state.redoStack.pop();
      }
    },
    addToUndoStack: (state) => {
      state.undoStack.push([...state.shapes]);
      state.redoStack = []; 
    },
    setIsDrag: (state, action) => {
      state.isDrag = action.payload;
    },

    setSelectedShapeId: (state, action) => {
      state.selectedShapeId = action.payload;
    }
  },
});

export const { setShapes, setIsDrawing, setUndo, setRedo, addToUndoStack, setIsDrag, setSelectedShapeId } = drawSlice.actions;

export default drawSlice.reducer;
