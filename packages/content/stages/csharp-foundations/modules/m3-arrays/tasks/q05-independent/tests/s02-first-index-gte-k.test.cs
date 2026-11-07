public class S02FirstIndexGteKTests
{
    [Fact(DisplayName = "S02 最初の該当位置")]
    public void S02FirstIndexGteK()
    {
        Assert.Equal(1, Answers.S02FirstIndexGteK(new int[] { 2, 8, 5 }, 5));
        Assert.Equal(-1, Answers.S02FirstIndexGteK(new int[] { 1, 2 }, 5));
        Assert.Equal(-1, Answers.S02FirstIndexGteK(new int[] { }, 5));
        Assert.Equal(0, Answers.S02FirstIndexGteK(new int[] { 5 }, 5));
        Assert.Equal(2, Answers.S02FirstIndexGteK(new int[] { 4, 4, 5 }, 5));
    }
}
