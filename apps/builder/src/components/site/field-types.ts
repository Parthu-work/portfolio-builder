import type { FieldType } from "@runtime/schema/portfolio";

export const FIELD_TYPE_SHORT: Record<FieldType, string> = {
  text: "Text",
  longtext: "Long text",
  richtext: "Rich text",
  url: "URL",
  email: "Email",
  phone: "Phone",
  number: "Number",
  metric: "Metric",
  date: "Date",
  daterange: "Date range",
  image: "Image",
  gallery: "Gallery",
  tags: "Tags",
  link: "Link",
  linklist: "Link list",
  video: "Video",
  code: "Code",
  select: "Choice",
};
