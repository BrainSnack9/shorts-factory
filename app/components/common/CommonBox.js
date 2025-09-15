"use client";

import { Box } from "@mui/material";

export default function CommonBox({ children, sx = {}, ...props }) {
  return (
    <Box sx={sx} {...props}>
      {children}
    </Box>
  );
}
