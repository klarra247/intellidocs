package com.intellidocs.domain.report.service;

import com.intellidocs.domain.report.entity.ReportData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.commonmark.ext.gfm.tables.TablesExtension;
import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextFontResolver;
import org.xhtmlrenderer.pdf.ITextRenderer;

import jakarta.annotation.PostConstruct;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportPdfRenderer {

    private final TemplateEngine templateEngine;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private static final List<org.commonmark.Extension> MD_EXTENSIONS =
            List.of(TablesExtension.create());

    private static final Parser MD_PARSER = Parser.builder()
            .extensions(MD_EXTENSIONS)
            .build();

    private static final HtmlRenderer MD_RENDERER = HtmlRenderer.builder()
            .extensions(MD_EXTENSIONS)
            .build();

    /**
     * ClassPath 폰트를 임시 파일로 복사해둔다.
     * OpenPDF의 addFont()는 실제 파일 경로가 필요하며,
     * JAR 내부 classpath URL(jar:file:...)은 읽지 못한다.
     */
    private Path fontRegularPath;
    private Path fontBoldPath;

    @PostConstruct
    void initFonts() throws Exception {
        Path fontDir = Files.createTempDirectory("intellidocs-fonts");
        fontRegularPath = extractFont("fonts/NanumGothic-Regular.ttf", fontDir.resolve("NanumGothic-Regular.ttf"));
        fontBoldPath = extractFont("fonts/NanumGothic-Bold.ttf", fontDir.resolve("NanumGothic-Bold.ttf"));
        log.info("[ReportPdfRenderer] Fonts extracted to {}", fontDir);
    }

    private Path extractFont(String classpath, Path target) throws Exception {
        try (InputStream is = new ClassPathResource(classpath).getInputStream()) {
            Files.copy(is, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return target;
    }

    public Path renderPdf(UUID reportId, ReportData data) throws Exception {
        // 1. Convert markdown content in sections to HTML
        ReportDataView view = toView(data);

        // 2. Render Thymeleaf template
        Context ctx = new Context(Locale.KOREAN);
        ctx.setVariable("reportData", view);
        ctx.setVariable("reportType", data.getMetadata() != null ? data.getMetadata().getReportType() : "");
        ctx.setVariable("generatedAt", data.getMetadata() != null && data.getMetadata().getGeneratedAt() != null
                ? data.getMetadata().getGeneratedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "");
        ctx.setVariable("confidenceLevel", data.getMetadata() != null ? data.getMetadata().getConfidenceLevel() : null);

        String html = templateEngine.process("report", ctx);

        // 3. Render PDF with Flying Saucer
        Path reportsDir = Paths.get(uploadDir, "reports");
        Files.createDirectories(reportsDir);
        Path pdfPath = reportsDir.resolve(reportId + ".pdf");

        ITextRenderer renderer = new ITextRenderer();

        // Register Korean fonts (static TTF, not variable font)
        ITextFontResolver fontResolver = renderer.getFontResolver();
        String regularPath = fontRegularPath.toAbsolutePath().toString();
        String boldPath = fontBoldPath.toAbsolutePath().toString();
        log.info("[ReportPdfRenderer] Registering font: {}, size={}KB", regularPath, Files.size(fontRegularPath) / 1024);
        log.info("[ReportPdfRenderer] Registering font: {}, size={}KB", boldPath, Files.size(fontBoldPath) / 1024);

        fontResolver.addFont(
                regularPath,
                com.lowagie.text.pdf.BaseFont.IDENTITY_H,
                com.lowagie.text.pdf.BaseFont.EMBEDDED
        );
        fontResolver.addFont(
                boldPath,
                com.lowagie.text.pdf.BaseFont.IDENTITY_H,
                com.lowagie.text.pdf.BaseFont.EMBEDDED
        );

        renderer.setDocumentFromString(html);
        renderer.layout();

        try (OutputStream os = new FileOutputStream(pdfPath.toFile())) {
            renderer.createPDF(os);
        }

        log.info("[ReportPdfRenderer] PDF generated: {}, size={}KB", pdfPath, Files.size(pdfPath) / 1024);
        return pdfPath;
    }

    private ReportDataView toView(ReportData data) {
        List<SectionView> sectionViews = new ArrayList<>();
        if (data.getSections() != null) {
            for (ReportData.Section section : data.getSections()) {
                String contentHtml = "";
                if (section.getContent() != null) {
                    Node doc = MD_PARSER.parse(section.getContent());
                    contentHtml = toXhtml(MD_RENDERER.render(doc));
                }
                sectionViews.add(new SectionView(
                        section.getHeading(),
                        contentHtml,
                        section.getTables()
                ));
            }
        }

        return new ReportDataView(
                data.getTitle(),
                data.getSummary() != null ? markdownToHtml(data.getSummary()) : null,
                sectionViews,
                data.getSources()
        );
    }

    private String markdownToHtml(String markdown) {
        Node doc = MD_PARSER.parse(markdown);
        String html = MD_RENDERER.render(doc);
        return toXhtml(html);
    }

    /**
     * commonmark는 HTML5를 출력하지만 Flying Saucer는 strict XHTML이 필요하다.
     */
    private static String toXhtml(String html) {
        return html
                .replaceAll("<br>", "<br/>")
                .replaceAll("<hr>", "<hr/>")
                .replaceAll("<img([^>]*)(?<!/)>", "<img$1/>");
    }

    // View objects for Thymeleaf (with HTML-rendered content)
    public record ReportDataView(
            String title,
            String summary,
            List<SectionView> sections,
            List<ReportData.SourceRef> sources
    ) {}

    public record SectionView(
            String heading,
            String contentHtml,
            List<ReportData.TableBlock> tables
    ) {}
}
