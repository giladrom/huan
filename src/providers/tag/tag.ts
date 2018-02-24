import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AngularFirestore, 
  AngularFirestoreCollection } from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';

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

  constructor(public http: HttpClient,
    private afs: AngularFirestore) {
    console.log('Hello TagProvider Provider');
  }

  
  updateTagLastSeen(tagId) {
    var tagCollectionRef = this.afs.collection<Tag>('tags', ref => {
      return ref.where('tagId', '==', tagId);
    });

    var utc = Date.now().toString();

    tagCollectionRef.doc(tagId).update({ lastseen: utc }).catch(() => {
      console.error("Tag ID " + tagId + " missing from Database");
    });
    
  }
  
}
