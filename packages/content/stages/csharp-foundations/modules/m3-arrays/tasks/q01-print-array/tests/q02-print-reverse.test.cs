public class Q02PrintReverseTests
{
    [Fact(DisplayName = "Q02 末尾から出す")]
    public void Q02PrintReverse()
    {
        Assert.Equal("4\n9\n3\n", ConsoleOutput.Capture(() => Answers.Q02PrintReverse(new int[] { 3, 9, 4 })));
        Assert.Equal("5\n", ConsoleOutput.Capture(() => Answers.Q02PrintReverse(new int[] { 5 })));
        Assert.Equal("3\n2\n1\n", ConsoleOutput.Capture(() => Answers.Q02PrintReverse(new int[] { 1, 2, 3 })));
    }
}
