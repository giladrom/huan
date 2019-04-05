import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { LeaderboardPage } from './leaderboard';
import { ProgressBarModule } from 'angular-progress-bar';

@NgModule({
  declarations: [
    LeaderboardPage,
  ],
  imports: [
    IonicPageModule.forChild(LeaderboardPage),
    ProgressBarModule
  ],
})
export class LeaderboardPageModule {}
