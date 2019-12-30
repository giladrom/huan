import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthProvider } from "../auth/auth";
const uuidv1 = require("uuid/v1");

export interface PartyMember {
  uid: string;
  name: string;
  joined: any;
  location: any;
  locationUpdated: any;
}

export interface SearchParty {
  owner: string;
  name: string;
  tagId: any;
  created: any;
  members: PartyMember[];
}

@Injectable()
export class SearchPartyProvider {
  constructor(public http: HttpClient, private authProvider: AuthProvider) {}

  create() {}

  remove() {}
}
