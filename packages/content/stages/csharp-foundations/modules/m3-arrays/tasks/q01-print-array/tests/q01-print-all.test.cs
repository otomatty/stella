public class Q01PrintAllTests
{
    [Fact(DisplayName = "Q01 先頭から出す")]
    public void Q01PrintAll()
    {
        Assert.Equal("3\n9\n4\n", ConsoleOutput.Capture(() => Answers.Q01PrintAll(new int[] { 3, 9, 4 })));
        Assert.Equal("5\n", ConsoleOutput.Capture(() => Answers.Q01PrintAll(new int[] { 5 })));
        Assert.Equal("1\n2\n3\n4\n", ConsoleOutput.Capture(() => Answers.Q01PrintAll(new int[] { 1, 2, 3, 4 })));
    }
}
