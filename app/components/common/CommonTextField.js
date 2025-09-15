"use client";

import { TextField } from "@mui/material";

export default function CommonTextField({
  multiline = false,
  rows,
  sx = {},
  ...props
}) {
  // rows가 있으면 자동으로 multiline을 true로 설정
  const isMultiline = multiline || rows !== undefined;

  const baseSx = {
    "& .MuiOutlinedInput-root": {
      fontSize: "14px",
      ...(isMultiline && {
        "& textarea": {
          fontSize: "14px",
        },
      }),
    },
    ...sx,
  };

  return (
    <TextField
      variant="outlined"
      multiline={isMultiline}
      rows={rows}
      sx={baseSx}
      {...props}
    />
  );
}
