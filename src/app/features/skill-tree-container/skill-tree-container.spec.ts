import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkillTreeContainer } from './skill-tree-container';

describe('SkillTreeContainer', () => {
  let component: SkillTreeContainer;
  let fixture: ComponentFixture<SkillTreeContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillTreeContainer],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillTreeContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
