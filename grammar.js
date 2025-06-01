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

/**
 * @file Pyret grammar for tree-sitter
 * @author ironmoon <me@ironmoon.dev>
 * @license AGPL-3.0-or-later
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  Call: 15,
  Binary: 10,
};

// prettier-ignore
module.exports = grammar({
  name: "pyret",

  extras: $ => [
    /\s/,
    $.line_comment,
    $.block_comment,
  ],

  externals: $ => [
    $.paren_no_space,
    $.paren_space,
    $.paren_after_brace,
    $.error_sentinel
  ],

  conflicts: $ => [[$.binop, $.inst_expr], [$._binop_expr, $.inst_expr]],

  word: $ => $.name,

  rules: {
    source_file: $ => seq(
      seq(optional($.use_stmt), repeat(choice($.provide_stmt, $.import_stmt))),
      optional($.block),
    ),

    use_stmt: $ => seq("use", $.name, $.import_source),

    import_stmt: $ => choice(
      seq("include", $.import_source),
      seq(
        "include",
        "from",
        $.module_ref,
        ":",
        optional(
          seq(
            $.include_spec,
            repeat(seq(",", $.include_spec)),
            optional(","),
          ),
        ),
        "end",
      ),
      seq("import", $.import_source, "as", $.name),
      seq("import", $.comma_names, "from", $.import_source),),
    import_source: $ => choice($.import_special, $.import_name),
    import_special: $ => seq(
      $.name,
      alias($.paren_no_space, "("),
      $.string,
      repeat(seq(",", $.string)),
      ")"
    ),
    import_name: $ => $.name,

    include_spec: $ => choice(
      $.include_name_spec,
      $.include_type_spec,
      $.include_data_spec,
      $.include_module_spec,
    ),
    include_name_spec: $ => $.name_spec,
    include_type_spec: $ => seq("type", $.name_spec),
    include_data_spec: $ => seq("data", $.data_name_spec, optional($.hiding_spec)),
    include_module_spec: $ => seq("module", $.name_spec),

    provide_stmt: $ => choice(
      $.provide_vals_stmt,
      $.provide_types_stmt,
      $.provide_block,
    ),
    provide_vals_stmt: $ => choice(
      seq("provide", $._stmt, "end"),
      seq("provide", "*")
    ),
    provide_types_stmt: $ => choice(
      seq("provide-types", $.record_ann),
      seq("provide-types", "*"),
    ),

    provide_block: $ => choice(
      seq(
        "provide:",
        optional(
          seq($.provide_spec, repeat(seq(",", $.provide_spec)), optional(","))
        ),
        "end",
      ),
      seq(
        "provide",
        "from",
        $.module_ref,
        ":",
        optional(
          seq($.provide_spec, repeat(seq(",", $.provide_spec)), optional(","))
        ),
        "end",
      ),
    ),

    provide_spec: $ => choice(
      $.provide_name_spec,
      $.provide_type_spec,
      $.provide_data_spec,
      $.provide_module_spec,
    ),

    name_spec: $ => choice(
      seq("*", optional($.hiding_spec)),
      $.module_ref,
      seq($.module_ref, "as", $.name),
    ),
    data_name_spec: $ => choice("*", $.module_ref),

    provide_name_spec: $ => $.name_spec,
    provide_type_spec: $ => seq("type", $.name_spec),
    provide_data_spec: $ => seq("data", $.data_name_spec, optional($.hiding_spec)),
    provide_module_spec: $ => seq("module", $.name_spec),

    hiding_spec: $ => seq(
      "hiding",
      alias(choice($.paren_space, $.paren_no_space), "("),
      optional(seq(repeat(seq($.name, ",")), $.name)),
      ")",
    ),

    module_ref: $ => seq(repeat(seq($.name, ".")), $.name),

    comma_names: $ => seq($.name, repeat(seq(",", $.name))),

    block: $ => repeat1($._stmt),

    _stmt: $ => choice(
      $.type_expr,
      $.newtype_expr,
      $.spy_stmt,
      $.let_expr,
      $.fun_expr,
      $.data_expr,
      $.when_expr,
      $.var_expr,
      $.rec_expr,
      $.assign_expr,
      $.check_test,
      $.check_expr,
      $.contract_stmt,
      $._binop_expr
    ),

    spy_stmt: $ => seq(
      "spy",
      optional($._binop_expr),
      ":",
      optional($.spy_contents),
      "end",
    ),
    spy_contents: $ => seq($.spy_field, repeat(seq(",", $.spy_field))),
    spy_field: $ => choice($.id_expr, seq($.name, ":", $._binop_expr)),

    type_expr: $ => seq("type", $.name, optional($.ty_params), "=", $.ann),
    newtype_expr: $ => seq("newtype", $.name, "as", $.name),
    let_expr: $ => seq($.toplevel_binding, "=", $._binop_expr),
    binding: $ => choice($.name_binding, $.tuple_binding),

    tuple_binding: $ => seq(
      "{",
      repeat(seq($.binding, ";")),
      $.binding,
      optional(";"),
      "}",
      optional(seq("as", $.name_binding)),
    ),
    name_binding: $ => prec(1, seq(
      optional("shadow"),
      $.name,
      optional(seq("::", $.ann)),
    )),

    toplevel_binding: $ => $.binding,
    multi_let_expr: $ => seq(
      "let",
      $.let_binding,
      repeat(seq(",", $.let_binding)),
      choice("block:", ":"),
      optional($.block),
      "end",
    ),
    let_binding: $ => choice($.let_expr, $.var_expr),
    letrec_expr: $ => seq(
      "letrec",
      $.let_expr,
      repeat(seq(",", $.let_expr)),
      choice("block:", ":"),
      optional($.block),
      "end"
    ),

    type_bind: $ => seq($.name, optional($.ty_params), "=", $.ann),
    newtype_bind: $ => seq("newtype", $.name, "as", $.name),

    type_let_bind: $ => choice($.type_bind, $.newtype_bind),
    type_let_expr: $ => seq(
      "type-let",
      $.type_let_bind,
      repeat(seq(",", $.type_let_bind)),
      choice("block:", ":"),
      optional($.block),
      "end",
    ),

    contract_stmt: $ => seq(
      $.name,
      "::",
      optional($.ty_params),
      choice($.ann, $.noparen_arrow_ann)
    ),

    fun_expr: $ => seq(
      "fun",
      $.name,
      $.fun_header,
      choice("block:", ":"),
      optional($.doc_string),
      optional($.block),
      optional($.where_clause),
      "end",
    ),
    fun_header: $ => seq(optional($.ty_params), $.args, optional($.return_ann)), // bad-arg choice elided
    ty_params: $ => seq("<", $.comma_names, ">"),
    args: $ => seq(
      alias(choice($.paren_no_space, $.paren_after_brace), "("),
      optional(seq($.binding, repeat(seq(",", $.binding)))),
      ")"
    ),
    return_ann: $ => seq("->", $.ann),
    // bad-args elided
    doc_string: $ => seq("doc:", $.string),
    where_clause: $ => seq("where:", optional($.block)),

    check_expr: $ => choice(
      seq(choice("check", "examples"), $.string, ":", optional($.block), "end"),
      seq(choice("check:", "examples:"), optional($.block), "end"),
    ),
    check_test: $ => choice(
      seq(
        $._binop_expr,
        $.check_op,
        optional(seq(
          "%",
          alias(choice($.paren_space, $.paren_no_space), "("),
          $._binop_expr,
          ")"
        )),
        $._binop_expr,
        optional(seq("because", $._binop_expr)),
      ),
      seq(
        $._binop_expr,
        $.check_op_postfix,
        optional(seq("because", $._binop_expr))
      ),
      // NOTE: I don't use this case and instead allow _binop_expr as a stmt
      // $._binop_expr,
    ),

    data_expr: $ => seq(
      "data",
      $.name,
      optional($.ty_params),
      ":",
      optional($.first_data_variant),
      repeat($.data_variant),
      optional($.data_sharing),
      optional($.where_clause),
      "end",
    ),
    variant_constructor: $ => seq($.name, $.variant_members),
    first_data_variant: $ => choice(
      seq($.variant_constructor, optional($.data_with)),
      seq($.name, optional($.data_with)),
    ),
    data_variant: $ => choice(
      seq("|", $.variant_constructor, optional($.data_with)),
      seq("|", $.name, optional($.data_with)),
    ),
    variant_members: $ => seq(
      alias($.paren_no_space, "("),
      optional(seq($.variant_member, repeat(seq(",", $.variant_member)))),
      ")"
    ),
    variant_member: $ => seq(optional("ref"), $.binding),
    data_with: $ => seq("with:", $.fields),
    data_sharing: $ => seq("sharing:", $.fields),

    var_expr: $ => seq("var", $.toplevel_binding, "=", $._binop_expr),
    rec_expr: $ => seq("rec", $.toplevel_binding, "=", $._binop_expr),
    assign_expr: $ => seq($.name, ":=", $._binop_expr),

    when_expr: $ => seq(
      "when",
      $._binop_expr,
      choice("block:", ":"),
      optional($.block),
      "end",
    ),

    _binop_expr: $ => prec.left(PREC.Binary,
      seq($._expr, repeat(seq($.binop, $._expr)))
    ),

    // TODO: these might need the scanner support
    binop: $ => choice(
      "+", "-", "*", "/", "<=", ">=", "==", "<=>", "=~", "<>",
      "<", ">", "and", "or", "^"
    ),

    check_op: $ => choice(
      "is", "is==", "is=~", "is<=>", "is-roughly", "is-not-roughly",
      "is-not", "is-not==", "is-not=~", "is-not<=>",
      "raises", "raises-other-than",
      "satisfies", "violates",
      "raises-satisfies", "raises-violates",
    ),

    check_op_postfix: $ => "does-not-raise",

    _expr: $ => choice(
      $.prim_expr,
      $.id_expr,
      $.prim_expr,
      $.lambda_expr,
      $.method_expr,
      $.app_expr,
      $.obj_expr,
      $.tuple_expr,
      $.tuple_get,
      $.dot_expr,
      $.template_expr,
      $.bracket_expr,
      $.get_bang_expr,
      $.update_expr,
      $.extend_expr,
      $.if_expr,
      $.if_pipe_expr,
      $.cases_expr,
      $.for_expr,
      $.user_block_expr,
      $.inst_expr,
      $.multi_let_expr,
      $.letrec_expr,
      $.type_let_expr,
      $.construct_expr,
      $.table_select,
      $.table_extend,
      $.table_filter,
      $.table_order,
      $.table_extract,
      $.table_update,
      $.table_expr,
      $.load_table_expr,
      $.reactor_expr,
    ),

    template_expr: $ => "...",

    // NOTE: bad-expr elided

    paren_expr: $ => seq(
      alias(choice($.paren_space, $.paren_after_brace), "("),
      $._binop_expr,
      ")"
    ),

    id_expr: $ => alias($.name, $.id_expr),

    prim_expr: $ => choice(
      $.num_expr,
      $.frac_expr,
      $.rfrac_expr,
      $.bool_expr,
      $.string_expr
    ),

    num_expr: $ => $.number,
    frac_expr: $ => /[-+]?[0-9]+\/[0-9]+/,
    rfrac_expr: $ => /~[-+]?[0-9]+\/[0-9]+/,
    bool_expr: $ => choice("true", "false"),
    string_expr: $ => $.string, // TODO: should this be an alias?

    lambda_expr: $ => choice(
      seq(
        "lam",
        $.fun_header,
        choice("block:", ":"),
        optional($.doc_string),
        optional($.block),
        optional($.where_clause),
        "end",
      ),
      seq(
        "{",
        $.fun_header,
        choice("block:", ":"),
        optional($.doc_string),
        optional($.block),
        optional($.where_clause),
        "}"
      ),
    ),

    method_expr: $ => seq(
      "method",
      $.fun_header,
      choice("block:", ":"),
      optional($.doc_string),
      optional($.block),
      optional($.where_clause),
      "end",
    ),

    app_expr: $ => choice(
      seq($._expr, $.app_args),
      // TODO: maybe these should be removed? these seem like a hack
      seq($._expr, alias($.paren_space, "("), ")"),
      seq(
        $._expr,
        alias($.paren_space, "("),
        $._binop_expr,
        repeat1(seq(",", $._binop_expr)),
        ")",
      ),
    ),

    app_args: $ => seq(
      alias($.paren_no_space, "("),
      optional($.comma_binops),
      ")"
    ),
    comma_binops: $ => prec.left(
      seq($._binop_expr, repeat(seq(",", $._binop_expr)))
    ),
    trailing_comma_binops: $ => seq($.comma_binops, optional(",")),

    // TODO: is this correct?
    inst_expr: $ => prec.dynamic(PREC.Call + 1,
      seq($._expr, "<", $.ann, repeat(seq(",", $.ann)), ">")
    ),

    tuple_expr: $ => seq("{", $.tuple_fields, "}"),
    tuple_fields: $ => seq(
      $._binop_expr, repeat(seq(";", $._binop_expr)), optional(";")
    ),

    tuple_get: $ => seq($._expr, ".", "{", $.number, "}"),


    obj_expr: $ => choice(
      seq("{", $.obj_fields, "}"), // TODO: simplify?
      seq("{", "}")
    ),
    obj_fields: $ => seq(
      $.obj_field,
      repeat(seq(",", $.obj_field)),
      optional(",")
    ),
    obj_field: $ => choice(
      seq($.key, ":", $._binop_expr),
      seq("ref", $.key, optional(seq("::", $.ann)), ":", $._binop_expr),
      seq(
        "method",
        $.key,
        $.fun_header,
        choice("block:", ":"),
        optional($.doc_string),
        optional($.block),
        optional($.where_clause),
        "end",
      ),
    ),

    fields: $ => seq($.field, repeat(seq(",", $.field)), optional(",")),
    field: $ => choice(
      seq($.key, ":", $._binop_expr),
      seq(
        "method",
        $.key,
        $.fun_header,
        choice("block:", ":"),
        optional($.doc_string),
        optional($.block),
        optional($.where_clause),
        "end",
      ),
    ),
    key: $ => $.name,

    construct_expr: $ => seq(
      "[",
      optional($.construct_modifier),
      $._binop_expr,
      ":",
      // optional($.trailing_comma_binops),
      optional(seq(
        $._binop_expr,
        repeat(seq(",", $._binop_expr)),
        optional(",")
      )),
      "]"
    ),
    construct_modifier: $ => "lazy",

    table_expr: $ => seq(
      "table:", optional($.table_headers), optional($.table_rows), "end"
    ),
    table_headers: $ => seq(
      repeat($.list_table_header),
      $.table_header
    ),
    list_table_header: $ => seq($.table_header, ","),
    table_header: $ => seq($.name, optional(seq("::", $.ann))),
    table_rows: $ => repeat1($.table_row),
    table_row: $ => seq("row:", optional($.table_items)),
    table_items: $ => seq(repeat($.list_table_item), $._binop_expr),
    list_table_item: $ => seq($._binop_expr, ","),

    // TODO: see the note in the bnf, can we handle this better in tree-sitter?
    reactor_expr: $ => seq("reactor", ":", $.fields, "end"),

    dot_expr: $ => seq($._expr, ".", $.name),
    bracket_expr: $ => prec(PREC.Call, seq($._expr, "[", $._binop_expr, "]")),

    get_bang_expr: $ => seq($._expr, "!", $.name),

    extend_expr: $ => seq($._expr, ".", "{", $.fields, "}"),
    update_expr: $ => seq($._expr, "!", "{", $.fields, "}"),

    if_expr: $ => seq(
      "if",
      $._binop_expr,
      choice("block:", ":"),
      optional($.block),
      repeat($.else_if),
      optional(seq("else:", optional($.block))),
      "end"
    ),
    else_if: $ => seq("else if", $._binop_expr, ":", optional($.block)),
    if_pipe_expr: $ => seq(
      "ask",
      choice("block:", ":"),
      repeat($.if_pipe_branch),
      optional(seq("|", "otherwise:", optional($.block))),
      "end",
    ),
    if_pipe_branch: $ => seq("|", $._binop_expr, "then:", optional($.block)),

    cases_binding: $ => seq(optional("ref"), $.binding),
    cases_args: $ => seq(
      alias($.paren_no_space, "("),
      optional(seq($.cases_binding, repeat(seq(",", $.cases_binding)), ")"))
    ),
    cases_expr: $ => seq(
      "cases",
      alias(choice($.paren_space, $.paren_no_space), "("),
      $.ann,
      ")",
      $._binop_expr,
      choice("block:", ":"),
      repeat($.cases_branch),
      optional(seq("|", "else", "=>", optional($.block))),
      "end",
    ),
    cases_branch: $ => seq("|", $.name, optional($.cases_args), "=>", optional($.block)),

    for_bind: $ => seq($.binding, "from", $._binop_expr),
    for_expr: $ => seq(
      "for",
      $._expr,
      alias($.paren_no_space, "("),
      optional(seq($.for_bind, repeat(seq(",", $.for_bind)))),
      ")",
      optional($.return_ann),
      choice("block:", ":"),
      optional($.block),
      "end",
    ),

    column_order: $ => seq($.name, choice("ascending", "descending")),
    table_select: $ => seq(
      "select", $.name, repeat(seq(",", $.name)), "from", $._expr, "end",
    ),
    table_filter: $ => seq(
      "sieve",
      $._expr,
      optional(seq("using", $.binding, repeat(seq(",", $.binding)))),
      ":",
      $._binop_expr,
      "end",
    ),
    table_order: $ => seq(
      "order",
      $._expr,
      ":",
      $.column_order,
      repeat(seq(",", $.column_order)),
      "end",
    ),
    table_extract: $ => seq(
      "extract", $.name, "from", $._expr, "end",
    ),
    table_update: $ => seq(
      "transform",
      $._expr,
      optional(seq("using", $.binding, repeat(seq(",", $.binding)))),
      ":",
      $.obj_fields,
      "end",
    ),
    table_extend: $ => seq(
      "extend",
      $._expr,
      optional(seq("using", $.binding, repeat(seq(",", $.binding)))),
      ":",
      $.table_extend_fields,
      "end",
    ),
    table_extend_fields: $ => seq(
      repeat($.list_table_extend_field),
      $.table_extend_field,
      optional(","),
    ),
    list_table_extend_field: $ => seq($.table_extend_field, ","),
    table_extend_field: $ => choice(
      seq($.key, optional(seq("::", $.ann)), ":", $._binop_expr),
      seq($.key, optional(seq("::", $.ann)), ":", $._expr, "of", $.name),
    ),

    load_table_expr: $ => seq(
      "load-table", ":", $.table_headers, optional($.load_table_specs), "end"
    ),

    load_table_specs: $ => repeat1($.load_table_spec),
    load_table_spec: $ => choice(
      seq("source:", $._expr),
      seq("sanitize", $.name, "using", $._expr),
    ),

    user_block_expr: $ => seq("block:", optional($.block), "end"),

    ann: $ => choice(
      $.name_ann,
      $.record_ann,
      $.arrow_ann,
      $.app_ann,
      $.pred_ann,
      $.dot_ann,
      $.tuple_ann
    ),

    name_ann: $ => $.name, // TODO: should this be an alias?
    comma_ann_field: $ => prec.right(
      seq($.ann_field, repeat(seq(",", $.ann_field)))
    ),
    trailing_comma_ann_field: $ => seq($.comma_ann_field, optional(",")),
    record_ann: $ => seq("{", optional($.trailing_comma_ann_field), "}"),
    ann_field: $ => seq($.name, "::", $.ann),

    tuple_ann: $ => seq(
      "{", $.ann, repeat(seq(";", $.ann)), optional(";"), "}"
    ),

    noparen_arrow_ann: $ => seq(optional($.arrow_ann_args), "->", $.ann),
    arrow_ann_args: $ => choice(
      $.comma_anns,
      seq(
        alias(choice($.paren_space, $.paren_no_space, $.paren_after_brace), "("),
        $.comma_ann_field,
        ")",
      ),
    ),
    arrow_ann: $ => seq(
      alias(choice($.paren_space, $.paren_no_space, $.paren_after_brace), "("),
      optional($.arrow_ann_args),
      "->",
      $.ann,
      ")",
    ),

    app_ann: $ => seq(choice($.name_ann, $.dot_ann), "<", $.comma_anns, ">"),

    comma_anns: $ => seq($.ann, repeat(seq(",", $.ann))),

    pred_ann: $ => seq(
      $.ann,
      "%",
      alias(choice($.paren_space, $.paren_no_space), "("),
      $.id_expr,
      ")",
    ),

    dot_ann: $ => seq($.name, ".", $.name),

    number: $ => /[-+]?[0-9]+(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?/,

    name: $ => /[a-zA-Z_][a-zA-Z0-9_-]*/, // TODO: should these matter?

    string: $ => choice(
      seq(
        "```",
        repeat(choice(
          $.escape_sequence,
          alias(/\\[\\nrt"'`]/, $.escape_sequence),
          alias($.unescaped_triple_string_fragment, $.string_content)
        )),
        token.immediate("```"),
      ),
      seq(
        '"',
        repeat(choice(
          $.escape_sequence,
          alias($.unescaped_double_string_fragment, $.string_content)
        )),
        token.immediate('"'),
      ),
      seq(
        "'",
        repeat(choice(
          $.escape_sequence,
          alias($.unescaped_single_string_fragment, $.string_content)
        )),
        token.immediate("'"),
      ),
    ),

    escape_sequence: $ => choice(
      /\\[01234567]{1,3}/,
      /\\x[0-9a-fA-F]{1,2}/,
      /\\u[0-9a-fA-F]{1,4}/,
      /\\[\\nrt"']/
    ),

    unescaped_triple_string_fragment: $ => token.immediate(prec(1,
      /(?:[^`\\]|`[^`]|``[^`])+/
    )),
    unescaped_double_string_fragment: $ => token.immediate(prec(1,
      /[^\\"\n\r]+/
    )),
    unescaped_single_string_fragment: $ => token.immediate(prec(1,
      /[^\\'\n\r]+/
    )),

    line_comment: $ => token(seq("#", /.*/)),
    // TODO: deal with nested multi-line comments
    block_comment: $ => token(prec(1, seq("#|", repeat(choice(/[^|]/, /\|[^#]/)), "|#"))),
  },
});
