/**
 * EXAMPLE 1: SIMPLE CHAIN - Controller (TypeScript)
 * 
 * Handles HTTP requests for chain endpoints.
 * Controllers are the "HTTP layer" - they don't contain business logic.
 * Business logic is in the service layer.
 */

import { Request, Response } from "express";
import simpleChainService from "../services/chain.service.js";
import { logger } from "../../../utils/logger.js";
import { ValidationError, ExternalServiceError } from "../../../utils/errors.js";

/**
 * SIMPLE CHAIN CONTROLLER CLASS
 */
export class SimpleChainController {
  /**
   * ============================================================
   * HANDLE EXECUTE CHAIN REQUEST
   * ============================================================
   * 
   * HTTP Endpoint: POST /api/chains/simple/execute
   * 
   * Receives a question, passes to service, returns full response.
   * This is a "blocking" endpoint - waits for complete response.
   * 
   * FLOW:
   * 1. Receive HTTP request with JSON body
   * 2. Validate request parameters
   * 3. Call service to execute chain
   * 4. Return formatted response or error
   */
  async handleExecuteChain(req: Request, res: Response): Promise<Response> {
    try {
      logger.debug(
        `[Controller] Received request: ${JSON.stringify(req.body).substring(0, 100)}`,
        "SimpleChainController.handleExecuteChain"
      );

      /**
       * STEP 1: VALIDATE REQUEST
       * 
       * Check that required fields are present.
       */
      const { question, temperature, model } = req.body;

      if (!question) {
        throw new ValidationError("Question is required");
      }

      /**
       * STEP 2: CALL SERVICE
       * 
       * Pass to service layer which handles business logic.
       */
      const result = await simpleChainService.executeChain({
        question,
        temperature,
        model,
      });

      logger.info(
        "[Controller] Chain executed successfully",
        "SimpleChainController.handleExecuteChain"
      );

      /**
       * STEP 3: RETURN SUCCESS RESPONSE
       * 
       * HTTP 200 with result data.
       */
      return res.status(200).json(result);
    } catch (error: any) {
      logger.error(
        "[Controller] Error",
        "SimpleChainController.handleExecuteChain",
        error
      );

      /**
       * ERROR RESPONSE
       * 
       * Different status code based on error type.
       */
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({
          status: "error",
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (error instanceof ExternalServiceError) {
        return res.status(error.statusCode).json({
          status: "error",
          error: {
            code: error.code,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Generic error
      return res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * ============================================================
   * HANDLE STREAM CHAIN REQUEST
   * ============================================================
   * 
   * HTTP Endpoint: GET /api/chains/simple/stream
   * 
   * Streams response in real-time using Server-Sent Events (SSE).
   * Client receives chunks as they arrive.
   * 
   * FLOW:
   * 1. Receive query parameters
   * 2. Set up SSE connection
   * 3. Stream chunks from service
   * 4. Close connection when done
   */
  async handleStreamChain(req: Request, res: Response): Promise<void> {
    try {
      logger.debug(
        `[Controller] Stream request: ${JSON.stringify(req.query)}`,
        "SimpleChainController.handleStreamChain"
      );

      /**
       * STEP 1: EXTRACT QUERY PARAMETERS
       */
      const question = req.query.question as string;
      const temperature = req.query.temperature
        ? parseFloat(req.query.temperature as string)
        : 0.7;
      const model = (req.query.model as string) || "gpt-4-turbo-preview";

      if (!question) {
        res.status(400).json({
          status: "error",
          error: { code: "MISSING_PARAMETER", message: "question is required" },
        });
        return;
      }

      /**
       * STEP 2: SET UP SERVER-SENT EVENTS (SSE)
       * 
       * SSE allows server to push data to client over HTTP.
       * 
       * Response headers:
       * - Content-Type: text/event-stream
       *   → Tells browser this is a stream, not a one-shot response
       * - Cache-Control: no-cache
       *   → Prevents caching of stream
       * - Connection: keep-alive
       *   → Keep the connection open for more data
       * - X-Accel-Buffering: no
       *   → For nginx/proxies (don't buffer this stream)
       */
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      logger.info(
        "[Controller] SSE connection established",
        "SimpleChainController.handleStreamChain"
      );

      /**
       * STEP 3: STREAM CHUNKS
       * 
       * Get async generator from service.
       * Send each chunk to client in SSE format.
       * 
       * SSE format:
       * data: {JSON payload}
       * (blank line)
       * 
       * Browser automatically parses and emits events.
       */
      let chunkCount = 0;

      for await (const chunk of simpleChainService.streamChain({
        question,
        temperature,
        model,
      })) {
        chunkCount++;

        /**
         * BUILD SSE MESSAGE
         * 
         * Each chunk is sent as a separate SSE event.
         */
        const message = JSON.stringify({
          chunk,
          sequence: chunkCount,
          type: "chunk",
        });

        res.write(`data: ${message}\n\n`);
      }

      /**
       * STEP 4: SEND COMPLETION MESSAGE
       * 
       * Tell client the stream is finished.
       */
      const completionMessage = JSON.stringify({
        status: "complete",
        totalChunks: chunkCount,
        type: "end",
      });

      res.write(`data: ${completionMessage}\n\n`);

      logger.info(
        `[Controller] Stream completed: ${chunkCount} chunks`,
        "SimpleChainController.handleStreamChain"
      );

      /**
       * STEP 5: CLOSE CONNECTION
       */
      res.end();
    } catch (error: any) {
      logger.error(
        "[Controller] Stream error",
        "SimpleChainController.handleStreamChain",
        error
      );

      /**
       * ERROR RESPONSE (SSE FORMAT)
       * 
       * Send error as SSE message before closing.
       */
      const errorMessage = JSON.stringify({
        status: "error",
        error: error.message,
        type: "error",
      });

      res.write(`data: ${errorMessage}\n\n`);
      res.end();
    }
  }

  /**
   * HEALTH CHECK ENDPOINT
   */
  handleHealth(req: Request, res: Response): Response {
    return res.status(200).json(simpleChainService.getHealth());
  }

  /**
   * DOCUMENTATION ENDPOINT
   */
  handleInfo(req: Request, res: Response): Response {
    return res.status(200).json({
      status: "success",
      name: "Simple Chain API",
      description:
        "LCEL basic chain: prompt → model → parser",
      lcelConcept:
        "Demonstrates core LCEL pattern using pipe operator to chain components",
      endpoints: [
        {
          method: "POST",
          path: "/execute",
          description: "Execute chain with blocking response",
          body: {
            question: "string (required)",
            temperature: "number 0-1 (optional, default 0.7)",
            model: "string (optional, default gpt-4-turbo-preview)",
          },
          example: {
            question: "What is artificial intelligence?",
            temperature: 0.7,
          },
          response: {
            status: "success",
            output: "string containing the answer",
            metadata: {
              timestamp: "ISO string",
              processingTime: "milliseconds",
              outputLength: "number of characters",
            },
          },
        },
        {
          method: "GET",
          path: "/stream",
          description: "Stream chain response in real-time (SSE)",
          queryParams: {
            question: "string (required)",
            temperature: "number (optional)",
            model: "string (optional)",
          },
          example: "/stream?question=What+is+ML?&temperature=0.5",
          response: "Server-Sent Events stream of chunks",
        },
        {
          method: "GET",
          path: "/health",
          description: "Service health check",
        },
        {
          method: "GET",
          path: "/info",
          description: "This documentation",
        },
      ],
      lcelBenefits: [
        "Composable: Chain components with | operator",
        "Type-safe: Built-in type checking",
        "Flexible: Easy to extend or swap components",
        "Streaming: Built-in streaming support",
        "Error handling: Consistent error management",
        "Reusable: Chains can be used as components",
      ],
    });
  }
}

// Export singleton
export const simpleChainController = new SimpleChainController();

export default simpleChainController;
