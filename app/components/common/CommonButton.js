"use client";

import { Button } from "@mui/material";

export default function CommonButton({
  variant = "outlined",
  size = "small",
  sx = {},
  ...props
}) {
  const baseSx = {
    fontSize: "0.8rem",
    borderRadius: 2,
    ...sx,
  };

  return <Button variant={variant} size={size} sx={baseSx} {...props} />;
}
