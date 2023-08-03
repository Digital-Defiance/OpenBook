import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { IGitOperations } from 'src/interfaces/gitOperations';

export class GitOperations {
  public readonly branch: string;
  public readonly excludeFiles: string[];
  public readonly fullPath: string;
  public readonly gitPath: string;
  public readonly gitConfigPath: string;
  public readonly mountPoint: string;
  public readonly mountParent: string;
  public readonly relativePath: string;
  public readonly repo: string;
  public readonly repoRecursive: boolean;

  constructor(config: IGitOperations) {
    this.branch = config.branch;
    this.excludeFiles = config.excludeFiles;
    this.fullPath = join(config.mountPoint, config.path);
    this.gitPath = join(config.mountPoint, '.git');
    this.gitConfigPath = join(this.gitPath, 'config');
    this.mountPoint = config.mountPoint;
    this.mountParent = dirname(this.mountPoint);
    let relativePath = config.path;
    // path may have leading slash, remove it if it does
    if (relativePath !== '/' && relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
    // append trailing slash if it doesn't exist
    if (!relativePath.endsWith('/')) {
      relativePath += '/';
    }
    this.relativePath = relativePath;
    this.repo = config.repo;
    this.repoRecursive = config.repoRecursive;

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
        const cloneArgs = this.repoRecursive ? [
          '--branch', this.branch,
          '--recursive',
        ] : [
          '--branch', this.branch,
        ];
        console.log('Clone args: ', cloneArgs);
        const result = await gitInstance.clone(this.repo, this.mountPoint, cloneArgs);
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

  public async getChangedFiles(sinceRevision: string): Promise<string[]> {
    console.log(`Checking for since revision: ${sinceRevision}`);
    const git = this.getSimpleGit();
    try {
      const diff = await git.diff([`${sinceRevision}..HEAD`, '--name-only', '--']);
      if (diff.trim().length === 0) {
        console.log(`No changes since revision: ${sinceRevision}`);
        return [];
      } else {
        const relativePath = this.relativePath;
        // git diff relative to the root of the repo, but we have this.relativePath which is either /
        // or a path relative to the root of the repo. We want to filter out any changes that are not
        // under this.relativePath
        // relative path may be /, in which case we want to pay attention to all paths
        // if relativePath is /tables then we only want to pay attention under /tables within the repo
        const changedFiles = diff
          .split('\n')
          .filter((file) => {
            if (relativePath === '/') {
              return true;
            } else {
              return file.startsWith(relativePath);
            }
          })
          .filter((file) => {
            if (this.excludeFiles) {
              // excludeFiles is a list of filenames only, not paths
              const filename = basename(file);
              return !this.excludeFiles.includes(filename);
            } else {
              return true;
            }
          }).filter((file) => {
            return file.length > 0;
          });
        console.log('Changed files: ', changedFiles);
        return changedFiles;
      }
    } catch (error) {
      console.error(`Failed to get changes since revision: ${sinceRevision}`, error);
      throw error;
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

  public async getFileHash(table: string, file: string) {
    const filePath = join(this.fullPath, table, file);
    const git = this.getSimpleGit();
    const hash = await git.raw(['hash-object', filePath]);
    return hash.trim();
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
