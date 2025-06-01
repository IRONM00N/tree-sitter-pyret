/* Copyright (C) 2025 ironmoon <me@ironmoon.dev>
 *
 * This file is part of tree-sitter-pyret.
 *
 * tree-sitter-pyret is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * tree-sitter-pyret is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with tree-sitter-pyret. If not, see <https://www.gnu.org/licenses/>.
 */

#include <wctype.h>

#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

enum TokenType {
  PAREN_NO_SPACE,
  PAREN_SPACE,
  PAREN_AFTER_BRACE,
  ERROR_SENTINEL
};

typedef enum {
  NORMAL,
  PREV_WHITESPACE,
  PREV_BRACE,
} ScannerPrev;

typedef struct {
  ScannerPrev prev;
} Scanner;

void* tree_sitter_pyret_external_scanner_create() {
  return ts_calloc(1, sizeof(Scanner));
}

void tree_sitter_pyret_external_scanner_destroy(void* payload) {
  ts_free((Scanner*)payload);
}

unsigned tree_sitter_pyret_external_scanner_serialize(void* payload,
                                                      char* buffer) {
  Scanner* scanner = (Scanner*)payload;
  buffer[0] = (char)scanner->prev;
  return 1;
}
void tree_sitter_pyret_external_scanner_deserialize(void* payload, char* buffer,
                                                    unsigned length) {
  Scanner* scanner = (Scanner*)payload;
  if (length >= 1) {
    scanner->prev = (ScannerPrev)buffer[0];
  } else {
    scanner->prev = NORMAL;
  }
}

static inline void advance(TSLexer* lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer* lexer) { lexer->advance(lexer, true); }

static inline bool handle_paren(Scanner* state, TSLexer* lexer,
                                const bool* valid_symbols) {
  while (iswspace(lexer->lookahead)) {
    skip(lexer);
    state->prev = PREV_WHITESPACE;
  }

  if (lexer->lookahead == '{') {
    advance(lexer);
    state->prev = PREV_BRACE;
    return false;
  }

  if (lexer->lookahead == '(') {
    if (valid_symbols[PAREN_AFTER_BRACE] && state->prev == PREV_BRACE) {
      lexer->result_symbol = PAREN_AFTER_BRACE;
      advance(lexer);
      state->prev = NORMAL;
      return true;
    } else if (valid_symbols[PAREN_SPACE] && state->prev == PREV_WHITESPACE) {
      lexer->result_symbol = PAREN_SPACE;
      advance(lexer);
      state->prev = NORMAL;
      return true;
    } else if (valid_symbols[PAREN_NO_SPACE] && state->prev == NORMAL) {
      lexer->result_symbol = PAREN_NO_SPACE;
      advance(lexer);
      return true;
    } else {
      printf("UNUSED PAREN!!!!, prev %d\n", state->prev);
    }
  }

  state->prev = NORMAL;
  return false;
}

bool tree_sitter_pyret_external_scanner_scan(void* payload, TSLexer* lexer,
                                             const bool* valid_symbols) {
  //   if (valid_symbols[ERROR_SENTINEL]) {
  //     return false;
  //   }

  Scanner* state = (Scanner*)payload;

  if (valid_symbols[PAREN_NO_SPACE] || valid_symbols[PAREN_SPACE] ||
      valid_symbols[PAREN_AFTER_BRACE]) {
    return handle_paren(state, lexer, valid_symbols);
  }

  state->prev = NORMAL;
  return false;
}
