import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { IGitOperations } from 'src/interfaces/gitOperations';

export class GitOperations {
  public readonly branch: string;
  public readonly fullPath: string;
  public readonly gitPath: string;
  public readonly gitConfigPath: string;
  public readonly mountPoint: string;
  public readonly mountParent: string;
  public readonly relativePath: string;
  public readonly repo: string;

  constructor(config: IGitOperations) {
    this.branch = config.branch;
    this.fullPath = join(config.mountPoint, config.path);
    this.gitPath = join(config.mountPoint, '.git');
    this.gitConfigPath = join(this.gitPath, 'config');
    this.mountPoint = config.mountPoint;
    this.mountParent = dirname(this.mountPoint);
    this.relativePath = config.path;
    this.repo = config.repo;

    if (!existsSync(this.mountParent)) {
      throw new Error('Mountpoint parent does not exist');
    }
  }

  public getSimpleGit(): SimpleGit {
    console.log(
      `Creating simple-git instance for mountpoint: ${this.mountPoint}`
    );
    const options: Partial<SimpleGitOptions> = {
      baseDir: this.mountPoint,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    return simpleGit(options);
  }

  public async checkoutBranch(git?: SimpleGit): Promise<void> {
    console.log(`Checking out branch: ${this.branch}`);
    git ??= this.getSimpleGit();
    git
      .fetch('origin')
      .then(() => git.checkoutBranch(this.branch, `origin/${this.branch}`))
      .catch(async (err) => {
        if (err.message.includes("couldn't find remote ref")) {
          console.error('Branch does not exist on remote.', this.branch);
          throw err;
        } else {
          console.error('Failed to checkout branch:', err);
        }
      });
  }

  public async ensureCheckedOutLatest() {
    let git: SimpleGit | undefined = undefined;

    console.log(`Ensuring mountpoint exists at mountpoint: ${this.mountPoint}`);
    if (existsSync(this.mountPoint)) {
      console.log('Mountpoint exists');
    } else {
      const mountpointParent = dirname(this.mountPoint);
      if (!existsSync(mountpointParent)) {
        console.log('Mountpoint parent does not exist, creating');
        mkdirSync(mountpointParent, { recursive: true });
      }
      console.log(
        `Cloning repo from: ${this.repo} into mountpoint: ${this.mountPoint}`
      );
      try {
        const gitInstance = simpleGit();
        const result = await gitInstance.clone(this.repo, this.mountPoint, {
          '--branch': this.branch,
        });
        console.log(result);

        // check if the branch was checked out
        const currentBranch = await this.getCurrentBranch();
        if (currentBranch !== this.branch) {
          console.error(`Failed to checkout branch: ${this.branch}`);
          throw new Error(`Failed to checkout branch: ${this.branch}`);
        }
      } catch (error) {
        console.error('Failed to clone repo: ', error);
        throw error;
      }
    }
    git ??= this.getSimpleGit();
    this.validateMountedRepo();
    await this.ensureBranch(git);
    await this.pullLatest(git);
  }

  public async ensureBranch(git?: SimpleGit) {
    console.log('Ensuring we are on the correct branch');

    git ??= this.getSimpleGit();

    // Try to get the current branch
    const currentBranchName = await git.revparse(['--abbrev-ref', 'HEAD']);

    if (currentBranchName !== this.branch) {
      await this.checkoutBranch(git);
    } else {
      console.log('Already on correct branch');
    }
  }

  public async getCurrentBranch(git?: SimpleGit): Promise<string> {
    console.log('Getting current branch');
    git ??= this.getSimpleGit();
    try {
      const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
      return currentBranch;
    } catch (error) {
      console.error('Failed to get current branch: ', error);
      console.warn(
        'The branch may exist but have no commits. If so, please create an initial commit.'
      );
      throw error;
    }
  }

  public async getCurrentRevision() {
    const git = this.getSimpleGit();
    const gitHash = await git.revparse(['HEAD']);
    console.log(`Current git hash: ${gitHash}`);
    return gitHash;
  }

  public async pullLatest(git?: SimpleGit) {
    console.log('Pulling latest changes');
    git ??= this.getSimpleGit();
    try {
      await git.pull('origin', this.branch);
    } catch (error) {
      console.error('Failed to pull changes: ', error);
      throw error;
    }
  }

  public async pushToOrigin(): Promise<void> {
    console.log('Pushing changes to origin');
    const git = this.getSimpleGit();
    await git.push('origin', this.branch).catch((error) => {
      console.error('Failed to push changes: ', error);
      throw error;
    });
  }

  public validateMountedRepo(): void {
    console.log('Verifying mountpoint is on the correct repo');
    if (!existsSync(this.gitPath)) {
      throw new Error('Mountpoint exists but is not a git repository');
    }
    const gitConfig = readFileSync(this.gitConfigPath, 'utf-8');
    const gitConfigRegex = /\[remote "origin"\]\s+url = (.*)/g;
    const gitConfigMatches = Array.from(gitConfig.matchAll(gitConfigRegex));
    if (gitConfigMatches.length === 0 || gitConfigMatches[0][1] !== this.repo) {
      throw new Error('Mountpoint is not on the correct repo');
    }
  }
}
