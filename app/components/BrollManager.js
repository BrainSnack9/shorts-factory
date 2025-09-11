"use client";

import { Box, Typography } from "@mui/material";
import BrollPicker from "./BrollPicker";

export default function BrollManager({ result, onPick }) {
  if (!result) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          먼저 스토리보드를 생성하세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
      <BrollPicker story={result} onPick={onPick} />
    </Box>
  );
}
