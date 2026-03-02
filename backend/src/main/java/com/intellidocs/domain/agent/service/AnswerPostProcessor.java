package com.intellidocs.domain.agent.service;

import com.intellidocs.domain.agent.dto.AgentResponse;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Best-effort extraction of structured data from LLM markdown answers.
 * All methods are null-safe and never throw exceptions.
 */
public final class AnswerPostProcessor {

    private AnswerPostProcessor() {}

    private static final Pattern MD_TABLE = Pattern.compile(
            "(\\|.+\\|\\n)(\\|[-:| ]+\\|\\n)((?:\\|.+\\|(?:\\n|$))+)", Pattern.MULTILINE);

    /**
     * Extract markdown tables from the answer text into structured TableData objects.
     * Returns an empty list if no tables are found or parsing fails.
     */
    public static List<AgentResponse.TableData> extractTables(String answer) {
        if (answer == null || answer.isBlank()) {
            return List.of();
        }

        List<AgentResponse.TableData> tables = new ArrayList<>();
        try {
            Matcher matcher = MD_TABLE.matcher(answer);
            while (matcher.find()) {
                String headerLine = matcher.group(1).trim();
                String dataBlock = matcher.group(3).trim();

                List<String> headers = parseCells(headerLine);
                if (headers.isEmpty()) continue;

                List<List<String>> rows = new ArrayList<>();
                for (String line : dataBlock.split("\\n")) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    List<String> cells = parseCells(trimmed);
                    if (!cells.isEmpty()) {
                        rows.add(cells);
                    }
                }

                if (!rows.isEmpty()) {
                    tables.add(AgentResponse.TableData.builder()
                            .headers(headers)
                            .rows(rows)
                            .build());
                }
            }
        } catch (Exception e) {
            // best-effort: return whatever we have so far
        }
        return tables;
    }

    private static List<String> parseCells(String line) {
        if (line == null || !line.contains("|")) return List.of();
        // Strip leading/trailing pipe, split by pipe, trim each cell
        String inner = line.startsWith("|") ? line.substring(1) : line;
        if (inner.endsWith("|")) inner = inner.substring(0, inner.length() - 1);
        return Arrays.stream(inner.split("\\|"))
                .map(String::trim)
                .collect(Collectors.toList());
    }
}
