import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

/*
  Generated class for the TagProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/

export interface Tag {  
  id?: string;
  name: string;
  tagId: string;
  breed: string;
  color: string;
  location: string;
  img: string;
  lastseen: string;
  active: boolean;
  lost: boolean;
}

@Injectable()
export class TagProvider {

  constructor(public http: HttpClient) {
    console.log('Hello TagProvider Provider');
  }

}
