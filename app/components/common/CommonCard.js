"use client";

import { Card, CardContent } from "@mui/material";

export default function CommonCard({ children, sx = {}, ...props }) {
  return (
    <Card
      sx={{
        mb: 3,
        backgroundColor: "#0a0a0a",
        border: "1px solid #2a2a2a",
        borderRadius: 4,
        ...sx,
      }}
      {...props}
    >
      <CardContent>{children}</CardContent>
    </Card>
  );
}
