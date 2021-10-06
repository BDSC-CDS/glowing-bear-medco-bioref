/**
 * Copyright 2017 - 2018  The Hyve B.V.
 * Copyright 2020 - 2021 EPFL LDS
 * Copyright 2020 - 2021 CHUV
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, Injector } from '@angular/core';
import { ExploreSearchService } from './api/medco-node/explore-search.service';
import { TreeNodeService } from './tree-node.service';
import { ErrorHelper } from '../utilities/error-helper';
import { DropMode } from '../models/drop-mode';

type NodeFullPath = {
  name: string;
  isBold: boolean;
}

type ResultType = {
  name: string;
  fullPath: NodeFullPath[];
}

const getPathList = (path: string) => {
  const splittedPath = path.split('/').filter(value => value != "");

  const pathList: string[] = [];

  splittedPath.forEach((_, index) => {
    pathList.push(splittedPath.slice(0, index + 1).reduce((result, value) => `${result}${value}/`, "/I2B2/"));
  });

  return pathList;
}

@Injectable()
export class TermSearchService {

  private _termSearch = "";

  private exploreSearchService: ExploreSearchService;
  private _results: ResultType[];

  constructor(private treeNodeService: TreeNodeService,
    private injector: Injector) {
    this.results = [];
  }

  search() {
    this.exploreSearchService = this.injector.get(ExploreSearchService);

    this.exploreSearchService.exploreSearchTerm(this.termSearch).subscribe((nodes) => {
      nodes.forEach((node) => {
        const pathList = getPathList(node.path);

        let displayNameList: string[] = new Array(pathList.length);

        pathList.forEach((value, pathListIndex) => {
          this.exploreSearchService.exploreSearchConceptInfo(value).subscribe((result) => {
            displayNameList[pathListIndex] = result[0].displayName;
            if (displayNameList.filter((_value) => !!_value).length === pathList.length) {
              const result = {
                name: node.name,
                fullPath: displayNameList.reverse().reduce((result, displayName) => [
                  ...result, {
                    name: displayName,
                    isBold: !result.find(({ isBold }) => isBold) && displayName.toLowerCase().indexOf(this.termSearch.toLowerCase()) !== -1
                }], []).reverse()
              };
              let resultIndex: number = -1;
              if (!this.results.find(({ name: resultName }) => resultName === node.name)) { // Not found in this.results, add
                resultIndex = this.results.push(result) - 1;
              } else { // Found in this.results, replace
                resultIndex = this.results.findIndex(({ name: resultName }) => resultName === node.name);
                this.results[resultIndex] = result;
              }
              setTimeout(() => {
                const elems = document.querySelectorAll('.term-search p-accordionTab.ui-ontology-elements');
                const elem = elems[resultIndex];
                const handleDragstart = (function (event) {
                  event.stopPropagation();
                  const dataObject = {
                    ...node,
                    dropMode: DropMode.TreeNode,
                    metadata: undefined,
                    path: `/I2B2${node.path}`
                  };
                  console.log('dataObject', dataObject);
                  console.log('this.treeNodeService', this.treeNodeService);
                  this.treeNodeService.selectedTreeNode = dataObject;
                }).bind(this);
                elem.addEventListener('dragstart', handleDragstart);
              }, 0);
            }
          });
        });
      });
    }, (err) => {
      ErrorHelper.handleError('Failed to search', err);
    });
  }

  onSearch() {
   // this.search();
  }

  onTermChange(event: any) {
    this.results = [];
    this.termSearch = event.target.value;
    if (this.termSearch.length > 2) {
      this.search();
    }
  }

  get termSearch(): string {
    return this._termSearch;
  }

  set termSearch(value: string) {
    this._termSearch = value;
  }

  get results(): ResultType[] {
    return this._results;
  }

  set results(value: ResultType[]) {
    this._results = value;
  }
}
