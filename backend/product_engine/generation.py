from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any

from product_engine.analysis import AnalysisOutput
from product_engine.schemas import Bounds, IRNode, IRSnapshot, ResponsiveHints, TokenSnapshot


@dataclass
class GenerationOutput:
    ir: IRSnapshot
    tokens: TokenSnapshot
    files: dict[str, str]


def _infer_tokens(analysis: AnalysisOutput) -> TokenSnapshot:
    palette = [item["dominant_color"] for item in analysis.image_stats if "dominant_color" in item]
    base = Counter(palette).most_common(1)[0][0] if palette else "#ffffff"
    return TokenSnapshot(
        colors={
            "surface.base": base,
            "surface.muted": "#f8fafc",
            "text.primary": "#0f172a",
            "text.muted": "#475569",
            "accent.primary": "#2563eb",
            "border.default": "#cbd5e1",
        },
        spacing={"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem"},
        typography={"h1": "2rem", "h2": "1.5rem", "body": "1rem", "caption": "0.875rem"},
        radii={"sm": "0.375rem", "md": "0.5rem", "lg": "0.75rem"},
        shadows={"card": "0 1px 2px 0 rgb(15 23 42 / 0.08)"},
    )


def _build_ir(analysis: AnalysisOutput, mode: str, instructions: str | None) -> IRSnapshot:
    nodes: list[IRNode] = []
    root_id = "page-root"
    nodes.append(
        IRNode(
            id=root_id,
            parentId=None,
            type="page",
            semanticRole="main",
            bounds=Bounds(x=0, y=0, width=1280, height=832),
            confidence=0.7,
            sourceRegionId=None,
        )
    )

    children: list[str] = []
    for idx, region in enumerate(analysis.regions):
        section_id = f"section-{idx}"
        children.append(section_id)
        nodes.append(
            IRNode(
                id=section_id,
                parentId=root_id,
                type="section",
                semanticRole="content-section",
                bounds=region.bounds,
                confidence=region.confidence,
                sourceRegionId=region.id,
                responsiveHints=ResponsiveHints(
                    breakpoint="unknown",
                    behavior="stack",
                    confidence=0.5,
                ),
                accessibilityHints={"landmark": "region"},
            )
        )
    nodes[0].children = children

    return IRSnapshot(
        project={"mode": mode, "name": "screenshot-product-job", "instructions": instructions or ""},
        pages=[{"id": "index", "route": "/", "rootNodeId": root_id}],
        source_regions=analysis.regions,
        nodes=nodes,
    )


def _render_nextjs_files(ir: IRSnapshot, tokens: TokenSnapshot) -> dict[str, str]:
    section_markup = "\n".join(
        [
            f"        <section key=\"{node.id}\" className=\"py-8\"><div className=\"container mx-auto px-4\"><div className=\"rounded-lg border p-6\">{node.semanticRole}</div></div></section>"
            for node in ir.nodes
            if node.type == "section"
        ]
    )
    index_tsx = f"""import Head from \"next/head\";

export default function HomePage() {{
  return (
    <>
      <Head>
        <title>Generated UI</title>
      </Head>
      <main className=\"min-h-screen bg-slate-50 text-slate-900\">\n{section_markup}\n      </main>
    </>
  );
}}
"""
    tokens_json = tokens.model_dump_json(indent=2)
    return {
        "package.json": """{
  \"name\": \"generated-screenshot-project\",
  \"private\": true,
  \"scripts\": {
    \"dev\": \"next dev\",
    \"build\": \"next build\"
  },
  \"dependencies\": {
    \"next\": \"latest\",
    \"react\": \"latest\",
    \"react-dom\": \"latest\"
  }
}
""",
        "tsconfig.json": """{
  \"compilerOptions\": {
    \"strict\": true,
    \"target\": \"ES2020\",
    \"lib\": [\"dom\", \"es2020\"],
    \"module\": \"esnext\",
    \"moduleResolution\": \"bundler\",
    \"jsx\": \"preserve\"
  }
}
""",
        "styles/globals.css": '@import "tailwindcss";\n',
        "pages/_app.tsx": """import type { AppProps } from \"next/app\";
import \"../styles/globals.css\";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
""",
        "pages/index.tsx": index_tsx,
        "lib/design-tokens.json": tokens_json,
        "ir/ir.json": ir.model_dump_json(indent=2),
    }


def generate_project(
    mode: str,
    export_target: str,
    analysis: AnalysisOutput,
    user_instructions: str | None,
) -> GenerationOutput:
    tokens = _infer_tokens(analysis)
    ir = _build_ir(analysis, mode=mode, instructions=user_instructions)

    if export_target == "nextjs-pages-ts-tailwind-v4":
        files = _render_nextjs_files(ir, tokens)
    elif export_target == "ir-json":
        files = {"ir/ir.json": ir.model_dump_json(indent=2)}
    elif export_target == "design-tokens-json":
        files = {"design-tokens.json": tokens.model_dump_json(indent=2)}
    else:
        files = {
            "component.json": "{}\n",
            "ir/ir.json": ir.model_dump_json(indent=2),
            "design-tokens.json": tokens.model_dump_json(indent=2),
        }

    return GenerationOutput(ir=ir, tokens=tokens, files=files)
