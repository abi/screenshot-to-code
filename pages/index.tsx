import Head from "next/head";
import { ScreenshotWorkbench } from "../components/screenshot-workbench";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Screenshot to Code</title>
        <meta name="description" content="Convert screenshots into production-ready UI code without backend." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ScreenshotWorkbench />
    </>
  );
}
