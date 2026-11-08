public class S07PrintPairSumsTests
{
    [Theory(DisplayName = "S07 二つの列")]
    [InlineData("3\n1 2 3\n4 5 6\n", "5\n7\n9\n")]
    [InlineData("1\n0\n0\n", "0\n")]
    public void S07PrintPairSums(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S07PrintPairSums())));
    }
}
