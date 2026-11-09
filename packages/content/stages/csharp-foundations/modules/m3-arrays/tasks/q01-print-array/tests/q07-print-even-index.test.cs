public class Q07PrintEvenIndexTests
{
    [Fact(DisplayName = "Q07 偶数番目だけ出す")]
    public void Q07PrintEvenIndex()
    {
        Assert.Equal("3\n4\n6\n", ConsoleOutput.Capture(() => Answers.Q07PrintEvenIndex(new int[] { 3, 9, 4, 11, 6 })));
        Assert.Equal("8\n", ConsoleOutput.Capture(() => Answers.Q07PrintEvenIndex(new int[] { 8, 1 })));
        Assert.Equal("1\n", ConsoleOutput.Capture(() => Answers.Q07PrintEvenIndex(new int[] { 1 })));
    }
}
