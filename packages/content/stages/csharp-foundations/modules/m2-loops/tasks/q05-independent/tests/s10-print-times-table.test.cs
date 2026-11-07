public class S10PrintTimesTableTests
{
    [Theory(DisplayName = "S10 掛け算の列")]
    [InlineData(2, "2\n4\n6\n8\n10\n12\n14\n16\n18\n")]
    [InlineData(0, "0\n0\n0\n0\n0\n0\n0\n0\n0\n")]
    [InlineData(1, "1\n2\n3\n4\n5\n6\n7\n8\n9\n")]
    public void S10PrintTimesTable(int n, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => Answers.S10PrintTimesTable(n)));
    }
}
