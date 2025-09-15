"use client";

import { Typography } from "@mui/material";

export default function CommonTypography({
  variant = "h6",
  sx = {},
  ...props
}) {
  const getVariantSx = (variant) => {
    switch (variant) {
      case "h6":
        return {
          fontSize: "16px",
          fontWeight: 700,
        };
      case "h5":
        return {
          fontSize: "20px",
          fontWeight: 700,
        };
      default:
        return {};
    }
  };

  const baseSx = {
    ...getVariantSx(variant),
    ...sx,
  };

  return <Typography variant={variant} sx={baseSx} {...props} />;
}
