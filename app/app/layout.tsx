import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"储能研究台 · 让每个判断都有依据",description:"储能产业链、业务证据、中外可比性与变化传导研究。公开披露快照，非投资建议。",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {return <html lang="zh-CN"><body>{children}</body></html>;}
