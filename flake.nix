/*
  Copyright (C) 2025 ironmoon <me@ironmoon.dev>

  This file is part of tree-sitter-pyret.

  tree-sitter-pyret is free software: you can redistribute it and/or
  modify it under the terms of the GNU Affero General Public License
  as published by the Free Software Foundation, either version 3 of
  the License, or (at your option) any later version.

  tree-sitter-pyret is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with tree-sitter-pyret. If not, see <https://www.gnu.org/licenses/>.
*/

{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
      systems,
    }:
    let
      lib = nixpkgs.lib;
      eachSystem = f: lib.genAttrs (import systems) (s: f (import nixpkgs { system = s; }));
    in
    {
      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            tree-sitter
            nodejs
            node-gyp
          ];
        };
      });
    };
}
