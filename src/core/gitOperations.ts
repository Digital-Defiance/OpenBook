import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
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
  public readonly simpleGit: SimpleGit;

  constructor(config: IGitOperations) {
    this.branch = config.branch;
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

    if (!existsSync(this.mountParent)) {
      throw new Error('Mountpoint parent does not exist');
    }
    console.log(
      `Creating simple-git instance for mountpoint: ${this.mountPoint}`
    );
    const simpleGitOptions: Partial<SimpleGitOptions> = {
      baseDir: this.mountPoint,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };

    this.simpleGit = simpleGit(simpleGitOptions);
  }

  public async checkoutBranch(): Promise<void> {
    console.log(`Checking out branch: ${this.branch}`);
    this.simpleGit
      .fetch('origin')
      .then(() => this.simpleGit.checkoutBranch(this.branch, `origin/${this.branch}`))
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
        const cloneArgs = [
          '--branch', this.branch,
        ];
        console.log('Clone args: ', cloneArgs);
        const result = await this.simpleGit.clone(this.repo, this.mountPoint, cloneArgs);
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
    this.validateMountedRepo();
    await this.ensureBranch();
    await this.pullLatest();
  }

  public async ensureBranch() {
    console.log('Ensuring we are on the correct branch');

    // Try to get the current branch
    const currentBranchName = await this.simpleGit.revparse(['--abbrev-ref', 'HEAD']);

    if (currentBranchName !== this.branch) {
      await this.checkoutBranch();
    } else {
      console.log('Already on correct branch');
    }
  }

  public async getChangedMarkdownFiles(sinceRevision: string): Promise<string[]> {
    console.log(`Checking for changes since revision: ${sinceRevision}`);

    try {
      const diffOutput = await this.simpleGit.diff([`${sinceRevision}..HEAD`, '--name-status', '--', '*.md']);
      if (!diffOutput.trim()) {
        console.log(`No changes since revision: ${sinceRevision}`);
        return [];
      }

      const changedFiles = diffOutput.split('\n')
        .map(line => {
          const [status, path] = line.split(/\s+/, 2); // Split status and path
          console.log(`Parsed line: status=${status}, path=${path}`); // Temporary logging
          return { status, path };
        })
        .filter(({ path }) => {
          if (!path) {
            console.error('Undefined path encountered in diff output');
            return false;
          }
          // Ensure the path is within the GITDB_PATH sub-directory
          return path.startsWith(this.relativePath);
        })
        .map(({ status, path }) => path); // Assuming path is now guaranteed to be defined

      console.log('Relevant changed files:', changedFiles);

      return changedFiles;

    } catch (error) {
      console.error(`Failed to get changes since revision: ${sinceRevision}`, error);
      throw error;
    }
  }

  public async getCurrentBranch(): Promise<string> {
    console.log('Getting current branch');
    try {
      const currentBranch = await this.simpleGit.revparse(['--abbrev-ref', 'HEAD']);
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
    const gitHash = await this.simpleGit.revparse(['HEAD']);
    console.log(`Current git hash: ${gitHash}`);
    return gitHash;
  }

  public async getFileHash(table: string, file: string) {
    const filePath = join(this.fullPath, table, file);
    const hash = await this.simpleGit.raw(['hash-object', filePath]);
    return hash.trim();
  }

  public async pullLatest(): Promise<boolean> {
    const gitRevision = await this.getCurrentRevision();
    console.log('Pulling latest changes');
    try {
      await this.simpleGit.pull('origin', this.branch);
    } catch (error) {
      console.error('Failed to pull changes: ', error);
      throw error;
    }
    const newGitRevision = await this.getCurrentRevision();
    if (gitRevision !== newGitRevision) {
      console.log('Changes pulled');
      return true;
    }
    console.log('No changes to pull');
    return false;
  }

  public async pushToOrigin(): Promise<void> {
    console.log('Pushing changes to origin');
    await this.simpleGit.push('origin', this.branch).catch((error) => {
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
