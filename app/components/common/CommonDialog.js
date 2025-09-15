"use client";

import { Dialog } from "@mui/material";

export default function CommonDialog({ sx = {}, ...props }) {
  const baseSx = {
    "& .MuiDialog-paper": {
      backgroundColor: "#0a0a0a",
      border: "1px solid #2a2a2a",
    },
    ...sx,
  };

  return (
    <Dialog
      PaperProps={{
        sx: {
          backgroundColor: "#0a0a0a",
          border: "1px solid #2a2a2a",
        },
      }}
      sx={baseSx}
      {...props}
    />
  );
}
